import { getAWSClientConfig } from "@/server/config/aws";
import {
	DescribeLoadBalancersCommand,
	DescribeTagsCommand,
	ElasticLoadBalancingV2Client,
	type LoadBalancer,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class LoadBalancerCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "loadbalancer",
			name: "Load Balancers",
			description: "Application, Network & Gateway Load Balancers",
			category: "Networking",
			icon: "Network",
			resources: [
				"application load balancers",
				"network load balancers",
				"gateway load balancers",
			],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "load-balancer");
	}

	private async initializeClient(): Promise<void> {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new ElasticLoadBalancingV2Client({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect(): Promise<any[]> {
		this.logger.info("Starting Load Balancer resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await this.collectLoadBalancers();

			this.logger.info(
				`Collected ${this.resources.length} Load Balancer resources`,
			);
			return this.resources;
		} catch (error: any) {
			this.logger.error("Load Balancer collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectLoadBalancers(): Promise<void> {
		try {
			const lbResponse = await this.paginate<LoadBalancer>(
				(params: any) =>
					this.client.send(new DescribeLoadBalancersCommand(params)),
				{},
				"LoadBalancers",
				"NextMarker",
			);

			for (const lb of lbResponse) {
				if (!lb.LoadBalancerArn || !lb.LoadBalancerName) continue;

				const tags = await this.getResourceTags([lb.LoadBalancerArn]);

				const resource = this.createResourceObject({
					id: lb.LoadBalancerArn,
					arn: lb.LoadBalancerArn,
					name: lb.LoadBalancerName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: lb.State?.Code,
					createdAt: lb.CreatedTime,
					tags: this.extractTags(tags[lb.LoadBalancerArn] || []),
					properties: {
						loadBalancerName: lb.LoadBalancerName,
						dnsName: lb.DNSName,
						type: lb.Type, // application, network, gateway
						scheme: lb.Scheme, // internet-facing, internal
						ipAddressType: lb.IpAddressType,
						availabilityZoneCount: lb.AvailabilityZones?.length || 0,
						canonicalHostedZoneId: lb.CanonicalHostedZoneId,
						customerOwnedIpv4Pool: lb.CustomerOwnedIpv4Pool,
						availabilityZones: lb.AvailabilityZones?.map((az) => ({
							zoneName: az.ZoneName,
							subnetId: az.SubnetId,
							outpostId: az.OutpostId,
							loadBalancerAddresses: az.LoadBalancerAddresses,
						})),
					},
					configuration: {
						type: lb.Type,
						scheme: lb.Scheme,
						ipAddressType: lb.IpAddressType,
						vpcId: lb.VpcId,
						securityGroups: lb.SecurityGroups,
						state: lb.State,
					},
					security: {
						isPublic: lb.Scheme === "internet-facing",
						securityGroupCount: lb.SecurityGroups?.length || 0,
						securityGroups: lb.SecurityGroups || [],
						scheme: lb.Scheme,
					},
					cost: {
						estimated: this.estimateLoadBalancerCost(lb),
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				resource.resourceType = "load-balancer";

				// Add essential relationships for infrastructure diagrams
				if (lb.VpcId) {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${lb.VpcId}`,
						"ec2-vpc",
					);
				}

				// Add subnet relationships (important for network topology)
				if (lb.AvailabilityZones) {
					for (const az of lb.AvailabilityZones) {
						if (az.SubnetId) {
							this.addRelationship(
								resource,
								"references",
								`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${az.SubnetId}`,
								"ec2-subnet",
							);
						}
					}
				}

				// Add security group relationships
				if (lb.SecurityGroups) {
					for (const sgId of lb.SecurityGroups) {
						this.addRelationship(
							resource,
							"references",
							`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sgId}`,
							"security-group",
						);
					}
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect load balancers:", error);
			this.errors.push(`Load Balancers: ${error.message}`);
		}
	}

	private async getResourceTags(
		arns: string[],
	): Promise<Record<string, any[]>> {
		try {
			const response = await this.client.send(
				new DescribeTagsCommand({
					ResourceArns: arns,
				}),
			);

			const tagMap: Record<string, any[]> = {};
			if (response.TagDescriptions) {
				for (const tagDescription of response.TagDescriptions) {
					if (tagDescription.ResourceArn) {
						tagMap[tagDescription.ResourceArn] = tagDescription.Tags || [];
					}
				}
			}
			return tagMap;
		} catch (error: any) {
			this.logger.debug("Failed to get tags:", error.message);
			return {};
		}
	}

	private estimateLoadBalancerCost(lb: LoadBalancer): number {
		// Load Balancer pricing estimation
		const baseCosts: Record<string, number> = {
			application: 16.43, // ALB: $0.0225 per hour = ~$16.43/month
			network: 16.43, // NLB: $0.0225 per hour = ~$16.43/month
			gateway: 36.0, // GWLB: $0.0495 per hour = ~$36/month (estimated)
		};

		const lbType = lb.Type || "application";
		const baseCost = baseCosts[lbType] ?? baseCosts.application ?? 16.43;

		// Additional costs for LCU (Load Balancer Capacity Units)
		// Simplified estimation - actual costs depend on usage
		const lcuCost = 5.84; // ~$0.008 per LCU-hour = ~$5.84/month per LCU

		return baseCost + lcuCost;
	}
}
