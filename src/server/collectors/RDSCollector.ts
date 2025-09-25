import { getAWSClientConfig } from "@/server/config/aws";
import {
	type DBCluster,
	type DBInstance,
	DescribeDBClustersCommand,
	DescribeDBInstancesCommand,
	ListTagsForResourceCommand,
	RDSClient,
} from "@aws-sdk/client-rds";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class RDSCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "rds",
			name: "RDS Databases",
			description: "Relational database instances",
			category: "Database",
			icon: "Database",
			resources: ["rds-instance", "rds-cluster", "rds-subnet-group"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "rds-instance");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new RDSClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting RDS resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await Promise.all([this.collectDBInstances(), this.collectDBClusters()]);

			this.logger.info(`Collected ${this.resources.length} RDS resources`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("RDS collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectDBInstances() {
		try {
			const instances = await this.paginate(
				(params: any) =>
					this.client.send(new DescribeDBInstancesCommand(params)),
				{},
				"DBInstances",
				"Marker",
			);

			for (const instance of instances as DBInstance[]) {
				if (!instance.DBInstanceIdentifier || !instance.DBInstanceArn) continue;

				const tags = await this.getResourceTags(instance.DBInstanceArn);

				const resource = this.createResourceObject({
					id: instance.DBInstanceArn,
					arn: instance.DBInstanceArn,
					name: instance.DBInstanceIdentifier,
					accountId: this.accountId || undefined,
					region: this.region,
					availabilityZone: instance.AvailabilityZone,
					status: instance.DBInstanceStatus,
					createdAt: instance.InstanceCreateTime,
					tags: tags,
					properties: {
						dbInstanceIdentifier: instance.DBInstanceIdentifier,
						dbInstanceClass: instance.DBInstanceClass,
						engine: instance.Engine,
						engineVersion: instance.EngineVersion,
						allocatedStorage: instance.AllocatedStorage,
						storageType: instance.StorageType,
						storageEncrypted: instance.StorageEncrypted,
						kmsKeyId: instance.KmsKeyId,
						dbName: instance.DBName,
						masterUsername: instance.MasterUsername,
						endpoint: instance.Endpoint
							? {
									address: instance.Endpoint.Address,
									port: instance.Endpoint.Port,
								}
							: null,
						multiAZ: instance.MultiAZ,
						publiclyAccessible: instance.PubliclyAccessible,
						dbSubnetGroupName: instance.DBSubnetGroup?.DBSubnetGroupName,
						vpcSecurityGroups: instance.VpcSecurityGroups?.map((sg) => ({
							vpcSecurityGroupId: sg.VpcSecurityGroupId,
							status: sg.Status,
						})),
						backupRetentionPeriod: instance.BackupRetentionPeriod,
						preferredBackupWindow: instance.PreferredBackupWindow,
						preferredMaintenanceWindow: instance.PreferredMaintenanceWindow,
					},
					configuration: {
						parameterGroups: instance.DBParameterGroups?.map((pg) => ({
							dbParameterGroupName: pg.DBParameterGroupName,
							parameterApplyStatus: pg.ParameterApplyStatus,
						})),
						optionGroupMemberships: instance.OptionGroupMemberships?.map(
							(og) => ({
								optionGroupName: og.OptionGroupName,
								status: og.Status,
							}),
						),
						dbSecurityGroups: instance.DBSecurityGroups,
					},
					security: {
						storageEncrypted: instance.StorageEncrypted || false,
						kmsKeyId: instance.KmsKeyId,
						publiclyAccessible: instance.PubliclyAccessible || false,
						vpcSecurityGroupIds:
							instance.VpcSecurityGroups?.map((sg) => sg.VpcSecurityGroupId) ||
							[],
					},
					cost: {
						estimated: this.estimateRDSCost(instance),
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				// Add subnet group relationships
				if (instance.DBSubnetGroup?.VpcId) {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${instance.DBSubnetGroup.VpcId}`,
						"ec2-vpc",
					);

					instance.DBSubnetGroup.Subnets?.forEach((subnet) => {
						if (subnet.SubnetIdentifier) {
							this.addRelationship(
								resource,
								"parents",
								`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${subnet.SubnetIdentifier}`,
								"ec2-subnet",
							);
						}
					});
				}

				// Add security group relationships
				instance.VpcSecurityGroups?.forEach((sg) => {
					if (sg.VpcSecurityGroupId) {
						this.addRelationship(
							resource,
							"references",
							`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sg.VpcSecurityGroupId}`,
							"security-group",
						);
					}
				});

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect RDS instances:", error);
			this.errors.push(`RDS Instances: ${error.message}`);
		}
	}

	private async collectDBClusters() {
		try {
			const clusters = await this.paginate(
				(params: any) =>
					this.client.send(new DescribeDBClustersCommand(params)),
				{},
				"DBClusters",
				"Marker",
			);

			for (const cluster of clusters as DBCluster[]) {
				if (!cluster.DBClusterIdentifier || !cluster.DBClusterArn) continue;

				const tags = await this.getResourceTags(cluster.DBClusterArn);

				const resource = this.createResourceObject({
					id: cluster.DBClusterArn,
					arn: cluster.DBClusterArn,
					name: cluster.DBClusterIdentifier,
					accountId: this.accountId || undefined,
					region: this.region,
					status: cluster.Status,
					createdAt: cluster.ClusterCreateTime,
					tags: tags,
					properties: {
						dbClusterIdentifier: cluster.DBClusterIdentifier,
						engine: cluster.Engine,
						engineVersion: cluster.EngineVersion,
						engineMode: cluster.EngineMode,
						databaseName: cluster.DatabaseName,
						masterUsername: cluster.MasterUsername,
						endpoint: cluster.Endpoint,
						readerEndpoint: cluster.ReaderEndpoint,
						multiAZ: cluster.MultiAZ,
						port: cluster.Port,
						storageEncrypted: cluster.StorageEncrypted,
						kmsKeyId: cluster.KmsKeyId,
						dbSubnetGroupName: cluster.DBSubnetGroup,
						vpcSecurityGroups: cluster.VpcSecurityGroups?.map((sg) => ({
							vpcSecurityGroupId: sg.VpcSecurityGroupId,
							status: sg.Status,
						})),
						dbClusterMembers: cluster.DBClusterMembers?.map((member) => ({
							dbInstanceIdentifier: member.DBInstanceIdentifier,
							isClusterWriter: member.IsClusterWriter,
							dbClusterParameterGroupStatus:
								member.DBClusterParameterGroupStatus,
						})),
						availabilityZones: cluster.AvailabilityZones,
						backupRetentionPeriod: cluster.BackupRetentionPeriod,
						preferredBackupWindow: cluster.PreferredBackupWindow,
						preferredMaintenanceWindow: cluster.PreferredMaintenanceWindow,
					},
					configuration: {
						dbClusterParameterGroup: cluster.DBClusterParameterGroup,
						dbSubnetGroup: cluster.DBSubnetGroup,
						enabledCloudwatchLogsExports: cluster.EnabledCloudwatchLogsExports,
						scalingConfiguration: cluster.ScalingConfigurationInfo,
						serverlessV2ScalingConfiguration:
							cluster.ServerlessV2ScalingConfiguration,
					},
					security: {
						storageEncrypted: cluster.StorageEncrypted || false,
						kmsKeyId: cluster.KmsKeyId,
						vpcSecurityGroupIds:
							cluster.VpcSecurityGroups?.map((sg) => sg.VpcSecurityGroupId) ||
							[],
					},
					cost: {
						estimated: this.estimateRDSClusterCost(cluster),
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				resource.resourceType = "rds-cluster";

				// Add relationships to cluster members
				cluster.DBClusterMembers?.forEach((member) => {
					if (member.DBInstanceIdentifier) {
						this.addRelationship(
							resource,
							"children",
							`arn:aws:rds:${this.region}:${this.accountId}:db:${member.DBInstanceIdentifier}`,
							"rds-instance",
							{ isClusterWriter: member.IsClusterWriter },
						);
					}
				});

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect RDS clusters:", error);
			this.errors.push(`RDS Clusters: ${error.message}`);
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
				`Failed to get tags for resource ${resourceArn}:`,
				error.message,
			);
			return [];
		}
	}

	private estimateRDSCost(instance: DBInstance): number {
		// Simplified RDS pricing
		const instanceClassCosts: Record<string, number> = {
			"db.t3.micro": 12.41,
			"db.t3.small": 24.82,
			"db.t3.medium": 49.64,
			"db.t3.large": 99.28,
			"db.m5.large": 138.24,
			"db.m5.xlarge": 276.48,
			"db.r5.large": 172.8,
			"db.r5.xlarge": 345.6,
		};

		const instanceCost =
			instanceClassCosts[instance.DBInstanceClass || ""] || 50;
		const storageCost = (instance.AllocatedStorage || 20) * 0.115; // $0.115 per GB for gp2

		return instanceCost + storageCost;
	}

	private estimateRDSClusterCost(cluster: DBCluster): number {
		// Aurora cluster pricing estimation
		const memberCount = cluster.DBClusterMembers?.length || 1;
		const baseCost = memberCount * 87.6; // Approximate cost per instance

		return baseCost;
	}
}
