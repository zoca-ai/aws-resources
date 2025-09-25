import { getAWSClientConfig } from "@/server/config/aws";
import {
	type BackupSummary,
	type ContinuousBackupsDescription,
	DescribeContinuousBackupsCommand,
	DescribeGlobalTableCommand,
	DescribeTableCommand,
	DescribeTimeToLiveCommand,
	DynamoDBClient,
	type GlobalTableDescription,
	ListBackupsCommand,
	ListGlobalTablesCommand,
	ListTablesCommand,
	ListTagsOfResourceCommand,
	type TableDescription,
	type TimeToLiveDescription,
} from "@aws-sdk/client-dynamodb";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class DynamoDBCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "dynamodb",
			name: "DynamoDB Tables",
			description: "NoSQL databases",
			category: "Database",
			icon: "Database",
			resources: ["tables", "global-tables", "backups"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "dynamodb-table");
	}

	private async initializeClient(): Promise<void> {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new DynamoDBClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting DynamoDB resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await Promise.all([
				this.collectTables(),
				this.collectGlobalTables(),
				this.collectBackups(),
			]);

			this.logger.info(`Collected ${this.resources.length} DynamoDB resources`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("DynamoDB collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectTables(): Promise<void> {
		try {
			const tablesResponse = await this.client.send(new ListTablesCommand({}));
			const tableNames = tablesResponse.TableNames || [];

			for (const tableName of tableNames) {
				const [tableDetails, tags, ttl, backups] = await Promise.all([
					this.getTableDetails(tableName),
					this.getTableTags(tableName),
					this.getTableTTL(tableName),
					this.getTableBackups(tableName),
				]);

				if (!tableDetails) continue;

				const resource = this.createResourceObject({
					id: tableDetails.TableArn!,
					arn: tableDetails.TableArn!,
					name: tableName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: tableDetails.TableStatus,
					createdAt: tableDetails.CreationDateTime,
					tags: tags,
					properties: {
						tableName: tableName,
						tableStatus: tableDetails.TableStatus,
						creationDateTime: tableDetails.CreationDateTime,
						itemCount: tableDetails.ItemCount,
						tableSizeBytes: tableDetails.TableSizeBytes,
						billingModeSummary: tableDetails.BillingModeSummary,
						provisionedThroughput: tableDetails.ProvisionedThroughput
							? {
									readCapacityUnits:
										tableDetails.ProvisionedThroughput.ReadCapacityUnits,
									writeCapacityUnits:
										tableDetails.ProvisionedThroughput.WriteCapacityUnits,
								}
							: null,
						keySchema: tableDetails.KeySchema?.map((key) => ({
							attributeName: key.AttributeName,
							keyType: key.KeyType,
						})),
						attributeDefinitions: tableDetails.AttributeDefinitions?.map(
							(attr) => ({
								attributeName: attr.AttributeName,
								attributeType: attr.AttributeType,
							}),
						),
						globalSecondaryIndexes: tableDetails.GlobalSecondaryIndexes?.map(
							(gsi) => ({
								indexName: gsi.IndexName,
								indexStatus: gsi.IndexStatus,
								itemCount: gsi.ItemCount,
								indexSizeBytes: gsi.IndexSizeBytes,
								projection: gsi.Projection,
								provisionedThroughput: gsi.ProvisionedThroughput,
							}),
						),
						localSecondaryIndexes: tableDetails.LocalSecondaryIndexes?.map(
							(lsi) => ({
								indexName: lsi.IndexName,
								itemCount: lsi.ItemCount,
								indexSizeBytes: lsi.IndexSizeBytes,
								projection: lsi.Projection,
							}),
						),
						streamSpecification: tableDetails.StreamSpecification,
						latestStreamArn: tableDetails.LatestStreamArn,
						latestStreamLabel: tableDetails.LatestStreamLabel,
						archivalSummary: tableDetails.ArchivalSummary,
						tableClassSummary: tableDetails.TableClassSummary,
						deletionProtectionEnabled: tableDetails.DeletionProtectionEnabled,
					},
					configuration: {
						timeToLive: ttl,
						continuousBackups: backups,
						sseDescription: tableDetails.SSEDescription,
						restoreSummary: tableDetails.RestoreSummary,
						replicas: tableDetails.Replicas?.map((replica) => ({
							regionName: replica.RegionName,
							replicaStatus: replica.ReplicaStatus,
							kmsKeyId: replica.KMSMasterKeyId,
							provisionedThroughput: replica.ProvisionedThroughputOverride,
							globalSecondaryIndexes: replica.GlobalSecondaryIndexes,
						})),
					},
					security: {
						encryption: {
							enabled: tableDetails.SSEDescription?.Status === "ENABLED",
							type: tableDetails.SSEDescription?.SSEType,
							kmsKeyId: tableDetails.SSEDescription?.KMSMasterKeyArn,
						},
					},
					cost: this.estimateDynamoDBCost(tableDetails),
				});

				// Add relationships
				if (
					tableDetails.StreamSpecification?.StreamEnabled &&
					tableDetails.LatestStreamArn
				) {
					this.addRelationship(
						resource,
						"children",
						tableDetails.LatestStreamArn,
						"dynamodb-stream",
					);
				}

				if (tableDetails.SSEDescription?.KMSMasterKeyArn) {
					const kmsKeyId =
						tableDetails.SSEDescription.KMSMasterKeyArn.split("/").pop();
					if (kmsKeyId) {
						this.addRelationship(resource, "references", kmsKeyId, "kms-key");
					}
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect DynamoDB tables:", error);
			this.errors.push(`DynamoDB Tables: ${error.message}`);
		}
	}

	private async collectGlobalTables(): Promise<void> {
		try {
			const command = new ListGlobalTablesCommand({});
			const response = await this.client.send(command);

			for (const globalTable of response.GlobalTables || []) {
				if (!globalTable.GlobalTableName) continue;

				const details = await this.getGlobalTableDetails(
					globalTable.GlobalTableName,
				);
				if (!details) continue;

				const resource = this.createResourceObject({
					id: details.GlobalTableArn!,
					arn: details.GlobalTableArn!,
					name: globalTable.GlobalTableName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: details.GlobalTableStatus,
					createdAt: details.CreationDateTime,
					properties: {
						globalTableName: globalTable.GlobalTableName,
						globalTableStatus: details.GlobalTableStatus,
						replicationGroup: globalTable.ReplicationGroup,
						creationDateTime: details.CreationDateTime,
					},
					configuration: {},
					security: {},
					cost: {
						estimated: 0, // Global tables inherit cost from regional tables
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				resource.resourceType = "dynamodb-global-table";

				// Add relationships to regional tables
				for (const region of globalTable.ReplicationGroup || []) {
					if (region.RegionName) {
						this.addRelationship(
							resource,
							"children",
							`arn:aws:dynamodb:${region.RegionName}:${this.accountId}:table/${globalTable.GlobalTableName}`,
							"dynamodb-table",
							{ region: region.RegionName },
						);
					}
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect global tables:", error);
			this.errors.push(`Global Tables: ${error.message}`);
		}
	}

	private async collectBackups(): Promise<void> {
		try {
			const command = new ListBackupsCommand({});
			const response = await this.client.send(command);

			for (const backup of response.BackupSummaries || []) {
				if (!backup.BackupArn || !backup.BackupName) continue;

				const resource = this.createResourceObject({
					id: backup.BackupArn,
					arn: backup.BackupArn,
					name: backup.BackupName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: backup.BackupStatus,
					createdAt: backup.BackupCreationDateTime,
					properties: {
						backupName: backup.BackupName,
						tableName: backup.TableName,
						tableId: backup.TableId,
						tableArn: backup.TableArn,
						backupStatus: backup.BackupStatus,
						backupType: backup.BackupType,
						backupSizeBytes: backup.BackupSizeBytes,
						backupExpiryDateTime: backup.BackupExpiryDateTime,
					},
					configuration: {},
					security: {},
					cost: {
						estimated: this.estimateBackupCost(backup),
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				resource.resourceType = "dynamodb-backup";

				// Add relationship to table
				if (backup.TableArn) {
					this.addRelationship(
						resource,
						"parents",
						backup.TableArn,
						"dynamodb-table",
					);
				}

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect DynamoDB backups:", error);
			this.errors.push(`DynamoDB Backups: ${error.message}`);
		}
	}

	private async getTableDetails(
		tableName: string,
	): Promise<TableDescription | null> {
		try {
			const command = new DescribeTableCommand({ TableName: tableName });
			const response = await this.client.send(command);
			return response.Table || null;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get details for table ${tableName}:`,
				error.message,
			);
			return null;
		}
	}

	private async getTableTags(
		tableName: string,
	): Promise<Array<{ key: string; value: string }>> {
		try {
			const tableArn = `arn:aws:dynamodb:${this.region}:${this.accountId}:table/${tableName}`;
			const command = new ListTagsOfResourceCommand({ ResourceArn: tableArn });
			const response = await this.client.send(command);
			return this.extractTags(response.Tags);
		} catch (error: any) {
			this.logger.debug(
				`Failed to get tags for table ${tableName}:`,
				error.message,
			);
			return [];
		}
	}

	private async getTableTTL(
		tableName: string,
	): Promise<TimeToLiveDescription | null> {
		try {
			const command = new DescribeTimeToLiveCommand({ TableName: tableName });
			const response = await this.client.send(command);
			return response.TimeToLiveDescription || null;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get TTL for table ${tableName}:`,
				error.message,
			);
			return null;
		}
	}

	private async getTableBackups(
		tableName: string,
	): Promise<ContinuousBackupsDescription | null> {
		try {
			const command = new DescribeContinuousBackupsCommand({
				TableName: tableName,
			});
			const response = await this.client.send(command);
			return response.ContinuousBackupsDescription || null;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get backups for table ${tableName}:`,
				error.message,
			);
			return null;
		}
	}

	private async getGlobalTableDetails(
		globalTableName: string,
	): Promise<GlobalTableDescription | null> {
		try {
			const command = new DescribeGlobalTableCommand({
				GlobalTableName: globalTableName,
			});
			const response = await this.client.send(command);
			return response.GlobalTableDescription || null;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get details for global table ${globalTableName}:`,
				error.message,
			);
			return null;
		}
	}

	private estimateDynamoDBCost(table: TableDescription): {
		estimated: number;
		currency: string;
		billingPeriod: string;
		lastUpdated: Date;
	} {
		let monthlyCost = 0;

		if (table.BillingModeSummary?.BillingMode === "PAY_PER_REQUEST") {
			// On-demand pricing: $0.25 per million read requests, $1.25 per million write requests
			const estimatedReads = 1000000; // 1M reads per month
			const estimatedWrites = 200000; // 200K writes per month
			monthlyCost =
				(estimatedReads / 1000000) * 0.25 + (estimatedWrites / 1000000) * 1.25;
		} else {
			// Provisioned capacity pricing
			const readUnits = table.ProvisionedThroughput?.ReadCapacityUnits || 0;
			const writeUnits = table.ProvisionedThroughput?.WriteCapacityUnits || 0;

			// $0.00065 per RCU per hour, $0.00325 per WCU per hour
			const hoursPerMonth = 730;
			monthlyCost =
				(readUnits * 0.00065 + writeUnits * 0.00325) * hoursPerMonth;

			// Add GSI costs
			for (const gsi of table.GlobalSecondaryIndexes || []) {
				const gsiRead = gsi.ProvisionedThroughput?.ReadCapacityUnits || 0;
				const gsiWrite = gsi.ProvisionedThroughput?.WriteCapacityUnits || 0;
				monthlyCost += (gsiRead * 0.00065 + gsiWrite * 0.00325) * hoursPerMonth;
			}
		}

		// Storage cost: $0.25 per GB per month
		const storageCostGB = (table.TableSizeBytes || 0) / 1024 / 1024 / 1024;
		monthlyCost += storageCostGB * 0.25;

		return {
			estimated: monthlyCost,
			currency: "USD",
			billingPeriod: "monthly",
			lastUpdated: new Date(),
		};
	}

	private estimateBackupCost(backup: BackupSummary): number {
		// Backup storage cost: $0.10 per GB per month
		const backupSizeGB = (backup.BackupSizeBytes || 0) / 1024 / 1024 / 1024;
		return backupSizeGB * 0.1;
	}
}
