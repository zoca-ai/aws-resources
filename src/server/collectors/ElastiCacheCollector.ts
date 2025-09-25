import { getAWSClientConfig } from "@/server/config/aws";
import {
	type CacheCluster,
	type CacheSubnetGroup,
	DescribeCacheClustersCommand,
	DescribeCacheSubnetGroupsCommand,
	DescribeReplicationGroupsCommand,
	ElastiCacheClient,
	ListTagsForResourceCommand,
	type ReplicationGroup,
} from "@aws-sdk/client-elasticache";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

interface CacheSubnetGroupInfo {
	name: string;
	description?: string;
	vpcId?: string;
	subnets: Array<{
		subnetId: string;
		availabilityZone?: string;
		supportedNetworkTypes?: string[];
	}>;
	supportedNetworkTypes?: string[];
}

interface ReplicationGroupInfo {
	description?: string;
	globalReplicationGroupInfo?: any;
	nodeGroups?: Array<{
		nodeGroupId?: string;
		status?: string;
		primaryEndpoint?: {
			address?: string;
			port?: number;
		};
		readerEndpoint?: {
			address?: string;
			port?: number;
		};
		slots?: string;
	}>;
	automaticFailover?: string;
	multiAZ?: string;
	configurationEndpoint?: {
		address?: string;
		port?: number;
	};
	clusterEnabled?: boolean;
	dataTiering?: string;
}

export class ElastiCacheCollector extends BaseCollector {
	private accountId: string | null = null;
	private replicationGroups: Record<string, ReplicationGroupInfo> = {};

	static getMetadata(): ResourceMetadata {
		return {
			id: "elasticache",
			name: "ElastiCache",
			description: "In-memory caching",
			category: "Database",
			icon: "Database",
			resources: ["clusters"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "elasticache-cluster");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new ElastiCacheClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting ElastiCache resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await Promise.all([
				this.collectCacheClusters(),
				this.collectReplicationGroups(),
			]);

			this.logger.info(
				`Collected ${this.resources.length} ElastiCache resources`,
			);
			return this.resources;
		} catch (error: any) {
			this.logger.error("ElastiCache collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectCacheClusters() {
		try {
			const command = new DescribeCacheClustersCommand({
				ShowCacheNodeInfo: true,
			});
			const response = await this.client.send(command);

			for (const cluster of response.CacheClusters || []) {
				if (!cluster.ARN || !cluster.CacheClusterId) continue;

				const tags = await this.getResourceTags(cluster.ARN);

				const resource = this.createResourceObject({
					id: cluster.ARN,
					arn: cluster.ARN,
					name: cluster.CacheClusterId,
					accountId: this.accountId || undefined,
					region: this.region,
					availabilityZone: cluster.PreferredAvailabilityZone,
					status: cluster.CacheClusterStatus,
					createdAt: cluster.CacheClusterCreateTime,
					tags: tags,
					properties: {
						engine: cluster.Engine,
						engineVersion: cluster.EngineVersion,
						cacheNodeType: cluster.CacheNodeType,
						numCacheNodes: cluster.NumCacheNodes,
						preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
						notificationConfiguration: cluster.NotificationConfiguration,
						cacheSecurityGroups: cluster.CacheSecurityGroups,
						cacheParameterGroup: cluster.CacheParameterGroup,
						cacheSubnetGroupName: cluster.CacheSubnetGroupName,
						cacheNodes: cluster.CacheNodes?.map((node: any) => ({
							cacheNodeId: node.CacheNodeId,
							cacheNodeStatus: node.CacheNodeStatus,
							cacheNodeCreateTime: node.CacheNodeCreateTime,
							endpoint: node.Endpoint
								? {
										address: node.Endpoint.Address,
										port: node.Endpoint.Port,
									}
								: null,
							parameterGroupStatus: node.ParameterGroupStatus,
							sourceCacheNodeId: node.SourceCacheNodeId,
							customerAvailabilityZone: node.CustomerAvailabilityZone,
						})),
						autoMinorVersionUpgrade: cluster.AutoMinorVersionUpgrade,
						snapshotRetentionLimit: cluster.SnapshotRetentionLimit,
						snapshotWindow: cluster.SnapshotWindow,
						authTokenEnabled: cluster.AuthTokenEnabled,
						authTokenLastModifiedDate: cluster.AuthTokenLastModifiedDate,
						transitEncryptionEnabled: cluster.TransitEncryptionEnabled,
						atRestEncryptionEnabled: cluster.AtRestEncryptionEnabled,
						replicationGroupId: cluster.ReplicationGroupId,
						logDeliveryConfigurations: cluster.LogDeliveryConfigurations,
						replicationGroupDetails: cluster.ReplicationGroupId
							? this.replicationGroups[cluster.ReplicationGroupId]
							: null,
					},
					configuration: {
						preferredAvailabilityZone: cluster.PreferredAvailabilityZone,
						preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
						autoMinorVersionUpgrade: cluster.AutoMinorVersionUpgrade,
						snapshotRetentionLimit: cluster.SnapshotRetentionLimit,
						snapshotWindow: cluster.SnapshotWindow,
					},
					security: {
						isPublic: false, // ElastiCache clusters are always within VPC
						encryption: {
							enabled:
								cluster.AtRestEncryptionEnabled ||
								cluster.TransitEncryptionEnabled,
							atRest: cluster.AtRestEncryptionEnabled,
							inTransit: cluster.TransitEncryptionEnabled,
						},
						authTokenEnabled: cluster.AuthTokenEnabled,
						securityGroups: cluster.SecurityGroups?.map((sg: any) => ({
							securityGroupId: sg.SecurityGroupId,
							status: sg.Status,
						})),
					},
					cost: this.estimateElastiCacheCost(cluster),
					cloudFormation: this.extractCloudFormationInfo({ Tags: tags }),
				});

				resource.resourceType = "elasticache-cluster";

				// Add relationships to VPC and subnets through subnet group
				if (cluster.CacheSubnetGroupName) {
					const subnetGroupInfo = await this.getCacheSubnetGroupInfo(
						cluster.CacheSubnetGroupName,
					);
					if (subnetGroupInfo) {
						resource.properties.subnetGroupDetails = subnetGroupInfo;
						if (subnetGroupInfo.vpcId) {
							this.addRelationship(
								resource,
								"parents",
								`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${subnetGroupInfo.vpcId}`,
								"ec2-vpc",
							);
						}
						for (const subnet of subnetGroupInfo.subnets || []) {
							this.addRelationship(
								resource,
								"references",
								`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${subnet.subnetId}`,
								"ec2-subnet",
							);
						}
					}
				}

				// Add security group relationships
				for (const sg of cluster.SecurityGroups || []) {
					if (sg.SecurityGroupId) {
						this.addRelationship(
							resource,
							"references",
							`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sg.SecurityGroupId}`,
							"security-group",
						);
					}
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect ElastiCache clusters:", error);
			this.errors.push(`ElastiCache Clusters: ${error.message}`);
		}
	}

	private async collectReplicationGroups() {
		try {
			const command = new DescribeReplicationGroupsCommand({});
			const response = await this.client.send(command);

			// Store replication groups information to enhance cluster resources
			this.replicationGroups = {};
			for (const group of response.ReplicationGroups || []) {
				if (!group.ReplicationGroupId) continue;

				this.replicationGroups[group.ReplicationGroupId] = {
					description: group.Description,
					globalReplicationGroupInfo: group.GlobalReplicationGroupInfo,
					nodeGroups: group.NodeGroups?.map((ng: any) => ({
						nodeGroupId: ng.NodeGroupId,
						status: ng.Status,
						primaryEndpoint: ng.PrimaryEndpoint
							? {
									address: ng.PrimaryEndpoint.Address,
									port: ng.PrimaryEndpoint.Port,
								}
							: undefined,
						readerEndpoint: ng.ReaderEndpoint
							? {
									address: ng.ReaderEndpoint.Address,
									port: ng.ReaderEndpoint.Port,
								}
							: undefined,
						slots: ng.Slots,
					})),
					automaticFailover: group.AutomaticFailover,
					multiAZ: group.MultiAZ,
					configurationEndpoint: group.ConfigurationEndpoint
						? {
								address: group.ConfigurationEndpoint.Address,
								port: group.ConfigurationEndpoint.Port,
							}
						: undefined,
					clusterEnabled: group.ClusterEnabled,
					dataTiering: group.DataTiering,
				};
			}
		} catch (error: any) {
			this.logger.error(
				"Failed to collect ElastiCache replication groups info:",
				error,
			);
			this.errors.push(`ElastiCache Replication Groups: ${error.message}`);
		}
	}

	private async getCacheSubnetGroupInfo(
		subnetGroupName: string,
	): Promise<CacheSubnetGroupInfo | null> {
		try {
			const command = new DescribeCacheSubnetGroupsCommand({
				CacheSubnetGroupName: subnetGroupName,
			});
			const response = await this.client.send(command);

			if (response.CacheSubnetGroups && response.CacheSubnetGroups.length > 0) {
				const subnetGroup = response.CacheSubnetGroups[0];
				return {
					name: subnetGroup.CacheSubnetGroupName || subnetGroupName,
					description: subnetGroup.CacheSubnetGroupDescription,
					vpcId: subnetGroup.VpcId,
					subnets:
						subnetGroup.Subnets?.map((subnet: any) => ({
							subnetId: subnet.SubnetIdentifier || "",
							availabilityZone: subnet.SubnetAvailabilityZone?.Name,
							supportedNetworkTypes: subnet.SupportedNetworkTypes,
						})) || [],
					supportedNetworkTypes: subnetGroup.SupportedNetworkTypes,
				};
			}
			return null;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get subnet group info for ${subnetGroupName}:`,
				error.message,
			);
			return null;
		}
	}

	private async getResourceTags(resourceArn: string) {
		try {
			const command = new ListTagsForResourceCommand({
				ResourceName: resourceArn,
			});
			const response = await this.client.send(command);
			return this.extractTags(response.TagList);
		} catch (error: any) {
			this.logger.debug(
				`Failed to get tags for ${resourceArn}:`,
				error.message,
			);
			return [];
		}
	}

	private estimateElastiCacheCost(cluster: CacheCluster): {
		estimated: number;
		currency: string;
		billingPeriod: string;
		lastUpdated: Date;
	} {
		const hourlyCosts: Record<string, number> = {
			"cache.t3.micro": 0.017,
			"cache.t3.small": 0.034,
			"cache.t3.medium": 0.068,
			"cache.t4g.micro": 0.016,
			"cache.t4g.small": 0.032,
			"cache.t4g.medium": 0.064,
			"cache.m6g.large": 0.156,
			"cache.m6g.xlarge": 0.312,
			"cache.m6g.2xlarge": 0.624,
			"cache.r6g.large": 0.226,
			"cache.r6g.xlarge": 0.452,
			"cache.r6g.2xlarge": 0.904,
			"cache.m5.large": 0.166,
			"cache.m5.xlarge": 0.333,
			"cache.m5.2xlarge": 0.665,
			"cache.r5.large": 0.243,
			"cache.r5.xlarge": 0.486,
			"cache.r5.2xlarge": 0.972,
		};

		const monthlyHours = 730;
		const hourlyRate = hourlyCosts[cluster.CacheNodeType || ""] || 0.1;
		const nodeCount = cluster.NumCacheNodes || 1;
		const monthlyCost = hourlyRate * monthlyHours * nodeCount;

		return {
			estimated: monthlyCost,
			currency: "USD",
			billingPeriod: "monthly",
			lastUpdated: new Date(),
		};
	}
}
