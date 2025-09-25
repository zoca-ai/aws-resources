import { getAWSClientConfig } from "@/server/config/aws";
import {
	DescribeInstancesCommand,
	DescribeSecurityGroupsCommand,
	DescribeSubnetsCommand,
	DescribeVolumesCommand,
	DescribeVpcsCommand,
	EC2Client,
	type Instance,
	type SecurityGroup,
	type Subnet,
	type Volume,
	type Vpc,
} from "@aws-sdk/client-ec2";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class EC2Collector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "ec2",
			name: "EC2 Resources",
			description: "Instances, VPCs & networking",
			category: "Compute",
			icon: "Server",
			resources: [
				"ec2-instance",
				"ec2-vpc",
				"ec2-subnet",
				"ec2-security-group",
				"ec2-volume",
			],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "ec2-instance");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new EC2Client({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting EC2 resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await Promise.all([
				this.collectInstances(),
				this.collectVPCs(),
				this.collectSubnets(),
				this.collectSecurityGroups(),
				this.collectVolumes(),
			]);

			this.logger.info(`Collected ${this.resources.length} EC2 resources`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("EC2 collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectInstances() {
		try {
			const command = new DescribeInstancesCommand({});
			const response = await this.client.send(command);

			for (const reservation of response.Reservations || []) {
				for (const instance of reservation.Instances || []) {
					const resource = this.createResourceObject({
						id: instance.InstanceId || "",
						arn: `arn:aws:ec2:${this.region}:${this.accountId}:instance/${instance.InstanceId}`,
						name: this.getResourceName(instance),
						accountId: this.accountId || undefined,
						region: this.region,
						availabilityZone: instance.Placement?.AvailabilityZone,
						status: instance.State?.Name,
						createdAt: instance.LaunchTime,
						tags: this.extractTags(instance.Tags),
						properties: {
							instanceId: instance.InstanceId,
							instanceType: instance.InstanceType,
							platform: instance.Platform || "linux",
							privateIpAddress: instance.PrivateIpAddress,
							publicIpAddress: instance.PublicIpAddress,
							keyName: instance.KeyName,
							vpcId: instance.VpcId,
							subnetId: instance.SubnetId,
							securityGroups: instance.SecurityGroups?.map((sg: any) => ({
								id: sg.GroupId,
								name: sg.GroupName,
							})),
						},
						configuration: {
							imageId: instance.ImageId,
							rootDeviceType: instance.RootDeviceType,
							ebsOptimized: instance.EbsOptimized,
						},
						security: {
							isPublic: !!instance.PublicIpAddress,
							securityGroupCount: instance.SecurityGroups?.length || 0,
							hasIamRole: !!instance.IamInstanceProfile?.Arn,
						},
						cloudFormation: this.extractCloudFormationInfo(instance),
						cost: this.estimateCost(instance),
					});

					// Add relationships
					if (instance.SubnetId) {
						this.addRelationship(
							resource,
							"parents",
							`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${instance.SubnetId}`,
							"ec2-subnet",
						);
					}
					if (instance.VpcId) {
						this.addRelationship(
							resource,
							"parents",
							`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${instance.VpcId}`,
							"ec2-vpc",
						);
					}

					// Add security group relationships
					instance.SecurityGroups?.forEach((sg: any) => {
						if (sg.GroupId) {
							this.addRelationship(
								resource,
								"references",
								`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sg.GroupId}`,
								"security-group",
							);
						}
					});

					this.resources.push(resource);
				}
			}
		} catch (error: any) {
			this.logger.error("Failed to collect EC2 instances:", error);
			this.errors.push(`EC2 Instances: ${error.message}`);
		}
	}

	private async collectVPCs() {
		try {
			const command = new DescribeVpcsCommand({});
			const response = await this.client.send(command);

			for (const vpc of response.Vpcs || []) {
				const resource = this.createResourceObject({
					id: vpc.VpcId || "",
					arn: `arn:aws:ec2:${this.region}:${this.accountId}:vpc/${vpc.VpcId}`,
					name: this.getResourceName(vpc),
					accountId: this.accountId || undefined,
					region: this.region,
					status: vpc.State,
					tags: this.extractTags(vpc.Tags),
					properties: {
						vpcId: vpc.VpcId,
						cidrBlock: vpc.CidrBlock,
						isDefault: vpc.IsDefault,
						dhcpOptionsId: vpc.DhcpOptionsId,
						instanceTenancy: vpc.InstanceTenancy,
					},
					configuration: {
						enableDnsSupport: vpc.EnableDnsSupport,
						enableDnsHostnames: vpc.EnableDnsHostnames,
					},
					cloudFormation: this.extractCloudFormationInfo(vpc),
				});

				resource.resourceType = "ec2-vpc";
				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect VPCs:", error);
			this.errors.push(`VPCs: ${error.message}`);
		}
	}

	private async collectSubnets() {
		try {
			const command = new DescribeSubnetsCommand({});
			const response = await this.client.send(command);

			for (const subnet of response.Subnets || []) {
				const resource = this.createResourceObject({
					id: subnet.SubnetId || "",
					arn: `arn:aws:ec2:${this.region}:${this.accountId}:subnet/${subnet.SubnetId}`,
					name: this.getResourceName(subnet),
					accountId: this.accountId || undefined,
					region: this.region,
					availabilityZone: subnet.AvailabilityZone,
					status: subnet.State,
					tags: this.extractTags(subnet.Tags),
					properties: {
						subnetId: subnet.SubnetId,
						vpcId: subnet.VpcId,
						cidrBlock: subnet.CidrBlock,
						availableIpAddressCount: subnet.AvailableIpAddressCount,
						mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
						defaultForAz: subnet.DefaultForAz,
					},
					cloudFormation: this.extractCloudFormationInfo(subnet),
				});

				resource.resourceType = "ec2-subnet";

				// Add VPC relationship
				if (subnet.VpcId) {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${subnet.VpcId}`,
						"ec2-vpc",
					);
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect subnets:", error);
			this.errors.push(`Subnets: ${error.message}`);
		}
	}

	private async collectSecurityGroups() {
		try {
			const command = new DescribeSecurityGroupsCommand({});
			const response = await this.client.send(command);

			for (const sg of response.SecurityGroups || []) {
				const resource = this.createResourceObject({
					id: sg.GroupId || "",
					arn: `arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sg.GroupId}`,
					name: sg.GroupName,
					accountId: this.accountId || undefined,
					region: this.region,
					tags: this.extractTags(sg.Tags),
					properties: {
						groupId: sg.GroupId,
						groupName: sg.GroupName,
						vpcId: sg.VpcId,
						description: sg.Description,
						ingressRules: sg.IpPermissions?.map((rule: any) => ({
							protocol: rule.IpProtocol,
							fromPort: rule.FromPort,
							toPort: rule.ToPort,
							ipRanges: rule.IpRanges?.map((range: any) => range.CidrIp),
							userIdGroupPairs: rule.UserIdGroupPairs?.map((pair: any) => ({
								groupId: pair.GroupId,
								description: pair.Description,
							})),
						})),
						egressRules: sg.IpPermissionsEgress?.map((rule: any) => ({
							protocol: rule.IpProtocol,
							fromPort: rule.FromPort,
							toPort: rule.ToPort,
							ipRanges: rule.IpRanges?.map((range: any) => range.CidrIp),
							userIdGroupPairs: rule.UserIdGroupPairs?.map((pair: any) => ({
								groupId: pair.GroupId,
								description: pair.Description,
							})),
						})),
					},
					security: {
						hasOpenIngress:
							sg.IpPermissions?.some((rule: any) =>
								rule.IpRanges?.some(
									(range: any) => range.CidrIp === "0.0.0.0/0",
								),
							) || false,
					},
					cloudFormation: this.extractCloudFormationInfo(sg),
				});

				resource.resourceType = "security-group";

				// Add VPC relationship
				if (sg.VpcId) {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${sg.VpcId}`,
						"ec2-vpc",
					);
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect security groups:", error);
			this.errors.push(`Security Groups: ${error.message}`);
		}
	}

	private async collectVolumes() {
		try {
			const command = new DescribeVolumesCommand({});
			const response = await this.client.send(command);

			for (const volume of response.Volumes || []) {
				const resource = this.createResourceObject({
					id: volume.VolumeId || "",
					arn: `arn:aws:ec2:${this.region}:${this.accountId}:volume/${volume.VolumeId}`,
					name: this.getResourceName(volume),
					accountId: this.accountId || undefined,
					region: this.region,
					availabilityZone: volume.AvailabilityZone,
					status: volume.State,
					createdAt: volume.CreateTime,
					tags: this.extractTags(volume.Tags),
					properties: {
						volumeId: volume.VolumeId,
						volumeType: volume.VolumeType,
						size: volume.Size,
						iops: volume.Iops,
						throughput: volume.Throughput,
						multiAttachEnabled: volume.MultiAttachEnabled,
						attachments: volume.Attachments?.map((att: any) => ({
							instanceId: att.InstanceId,
							device: att.Device,
							state: att.State,
							attachTime: att.AttachTime,
						})),
					},
					security: {
						encrypted: volume.Encrypted || false,
						kmsKeyId: volume.KmsKeyId,
					},
					cloudFormation: this.extractCloudFormationInfo(volume),
					cost: {
						estimated: (volume.Size || 0) * 0.08, // $0.08 per GB for gp3
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				resource.resourceType = "ebs-volume";

				// Add instance relationships for attached volumes
				volume.Attachments?.forEach((attachment: any) => {
					if (attachment.InstanceId) {
						this.addRelationship(
							resource,
							"parents",
							`arn:aws:ec2:${this.region}:${this.accountId}:instance/${attachment.InstanceId}`,
							"ec2-instance",
							{ device: attachment.Device, state: attachment.State },
						);
					}
				});

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect volumes:", error);
			this.errors.push(`EBS Volumes: ${error.message}`);
		}
	}
}
