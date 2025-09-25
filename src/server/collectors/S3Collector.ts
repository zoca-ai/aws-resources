import { getAWSClientConfig } from "@/server/config/aws";
import {
	type Bucket,
	GetBucketAclCommand,
	GetBucketEncryptionCommand,
	GetBucketLifecycleConfigurationCommand,
	GetBucketLocationCommand,
	GetBucketPolicyStatusCommand,
	GetBucketReplicationCommand,
	GetBucketTaggingCommand,
	GetBucketVersioningCommand,
	ListBucketsCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

interface BucketDetails {
	location: string | null;
	tags: Array<{ key: string; value: string }>;
	versioning: any;
	encryption: any;
	isPublic: boolean;
	acl: any;
	policyStatus: any;
	lifecycle: any;
	replication: any;
	publicAccessBlock: any;
}

export class S3Collector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "s3",
			name: "S3 Buckets",
			description: "Object storage",
			category: "Storage",
			icon: "HardDrive",
			resources: ["s3-bucket"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "s3-bucket");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new S3Client({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting S3 bucket collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await this.collectBuckets();
			this.logger.info(`Collected ${this.resources.length} S3 buckets`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("S3 collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectBuckets() {
		try {
			this.logger.info("Listing S3 buckets...");
			const command = new ListBucketsCommand({});
			const response = await this.client.send(command);

			this.logger.info(`Found ${response.Buckets?.length || 0} S3 buckets`);

			for (const bucket of response.Buckets || []) {
				if (!bucket.Name) continue;

				this.logger.info(`Collecting details for bucket: ${bucket.Name}`);
				const bucketDetails = await this.getBucketDetails(bucket.Name);

				const resource = this.createResourceObject({
					id: `arn:aws:s3:::${bucket.Name}`,
					arn: `arn:aws:s3:::${bucket.Name}`,
					name: bucket.Name,
					accountId: this.accountId || undefined,
					region: bucketDetails.location || "us-east-1",
					createdAt: bucket.CreationDate,
					tags: bucketDetails.tags,
					properties: {
						bucketName: bucket.Name,
						creationDate: bucket.CreationDate,
						location: bucketDetails.location,
						versioning: bucketDetails.versioning,
						lifecycle: bucketDetails.lifecycle,
						replication: bucketDetails.replication,
					},
					configuration: {
						versioning: bucketDetails.versioning,
						encryption: bucketDetails.encryption,
						publicAccessBlock: bucketDetails.publicAccessBlock,
						lifecycle: bucketDetails.lifecycle,
						replication: bucketDetails.replication,
					},
					security: {
						isPublic: bucketDetails.isPublic,
						encryption: bucketDetails.encryption,
						acl: bucketDetails.acl,
						policyStatus: bucketDetails.policyStatus,
					},
					cost: {
						estimated: 0.023, // Basic S3 pricing per GB
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				this.resources.push(resource);
				this.logger.debug(
					`Successfully collected bucket: ${bucket.Name} in region ${bucketDetails.location || "us-east-1"}`,
				);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect S3 buckets:", error);
			this.errors.push(`S3 Buckets: ${error.message}`);
		}
	}

	private async getBucketDetails(bucketName: string): Promise<BucketDetails> {
		this.logger.debug(`Getting detailed information for bucket: ${bucketName}`);
		const details: BucketDetails = {
			location: null,
			tags: [],
			versioning: null,
			encryption: null,
			isPublic: false,
			acl: null,
			policyStatus: null,
			lifecycle: null,
			replication: null,
			publicAccessBlock: null,
		};

		// Get bucket location
		try {
			const locationCommand = new GetBucketLocationCommand({
				Bucket: bucketName,
			});
			const locationResponse = await this.client.send(locationCommand);
			details.location = locationResponse.LocationConstraint || "us-east-1";
			this.logger.debug(
				`Bucket ${bucketName} located in region: ${details.location}`,
			);
		} catch (error: any) {
			this.logger.debug(
				`Failed to get location for bucket ${bucketName}:`,
				error.message,
			);
		}

		// Get bucket tags
		try {
			const tagsCommand = new GetBucketTaggingCommand({ Bucket: bucketName });
			const tagsResponse = await this.client.send(tagsCommand);
			details.tags = this.extractTags(tagsResponse.TagSet);
			this.logger.debug(`Bucket ${bucketName} has ${details.tags.length} tags`);
		} catch (error: any) {
			if (error.name !== "NoSuchTagSet") {
				this.logger.debug(
					`Failed to get tags for bucket ${bucketName}:`,
					error.message,
				);
			}
		}

		// Get bucket versioning
		try {
			const versioningCommand = new GetBucketVersioningCommand({
				Bucket: bucketName,
			});
			const versioningResponse = await this.client.send(versioningCommand);
			details.versioning = {
				status: versioningResponse.Status,
				mfaDelete: versioningResponse.MFADelete,
			};
		} catch (error: any) {
			this.logger.debug(
				`Failed to get versioning for bucket ${bucketName}:`,
				error.message,
			);
		}

		// Get bucket encryption
		try {
			const encryptionCommand = new GetBucketEncryptionCommand({
				Bucket: bucketName,
			});
			const encryptionResponse = await this.client.send(encryptionCommand);
			details.encryption = {
				enabled: true,
				rules: encryptionResponse.ServerSideEncryptionConfiguration?.Rules?.map(
					(rule: any) => ({
						algorithm: rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm,
						kmsMasterKeyId:
							rule.ApplyServerSideEncryptionByDefault?.KMSMasterKeyID,
						bucketKeyEnabled: rule.BucketKeyEnabled,
					}),
				),
			};
			this.logger.debug(
				`Bucket ${bucketName} has encryption enabled with ${details.encryption.rules?.length || 0} rules`,
			);
		} catch (error: any) {
			if (error.name === "ServerSideEncryptionConfigurationNotFoundError") {
				details.encryption = { enabled: false };
				this.logger.debug(
					`Bucket ${bucketName} has no encryption configuration`,
				);
			} else {
				this.logger.debug(
					`Failed to get encryption for bucket ${bucketName}:`,
					error.message,
				);
			}
		}

		// Get bucket policy status
		try {
			const policyStatusCommand = new GetBucketPolicyStatusCommand({
				Bucket: bucketName,
			});
			const policyStatusResponse = await this.client.send(policyStatusCommand);
			details.policyStatus = policyStatusResponse.PolicyStatus;
			details.isPublic = policyStatusResponse.PolicyStatus?.IsPublic || false;
			this.logger.debug(
				`Bucket ${bucketName} public status: ${details.isPublic ? "PUBLIC" : "PRIVATE"}`,
			);
		} catch (error: any) {
			if (error.name !== "NoSuchBucketPolicy") {
				this.logger.debug(
					`Failed to get policy status for bucket ${bucketName}:`,
					error.message,
				);
			}
		}

		// Get bucket ACL
		try {
			const aclCommand = new GetBucketAclCommand({ Bucket: bucketName });
			const aclResponse = await this.client.send(aclCommand);
			details.acl = {
				owner: {
					id: aclResponse.Owner?.ID,
					displayName: aclResponse.Owner?.DisplayName,
				},
				grants: aclResponse.Grants?.map((grant: any) => ({
					grantee: {
						type: grant.Grantee?.Type,
						id: grant.Grantee?.ID,
						uri: grant.Grantee?.URI,
						displayName: grant.Grantee?.DisplayName,
					},
					permission: grant.Permission,
				})),
			};
		} catch (error: any) {
			this.logger.debug(
				`Failed to get ACL for bucket ${bucketName}:`,
				error.message,
			);
		}

		// Get bucket lifecycle configuration
		try {
			const lifecycleCommand = new GetBucketLifecycleConfigurationCommand({
				Bucket: bucketName,
			});
			const lifecycleResponse = await this.client.send(lifecycleCommand);
			details.lifecycle = {
				rules: lifecycleResponse.Rules?.map((rule: any) => ({
					id: rule.ID,
					status: rule.Status,
					prefix: rule.Prefix,
					transitions: rule.Transitions,
					expiration: rule.Expiration,
					noncurrentVersionTransitions: rule.NoncurrentVersionTransitions,
					noncurrentVersionExpiration: rule.NoncurrentVersionExpiration,
				})),
			};
		} catch (error: any) {
			if (error.name !== "NoSuchLifecycleConfiguration") {
				this.logger.debug(
					`Failed to get lifecycle for bucket ${bucketName}:`,
					error.message,
				);
			}
		}

		// Get bucket replication configuration
		try {
			const replicationCommand = new GetBucketReplicationCommand({
				Bucket: bucketName,
			});
			const replicationResponse = await this.client.send(replicationCommand);
			details.replication = {
				role: replicationResponse.ReplicationConfiguration?.Role,
				rules: replicationResponse.ReplicationConfiguration?.Rules?.map(
					(rule: any) => ({
						id: rule.ID,
						status: rule.Status,
						priority: rule.Priority,
						destination: {
							bucket: rule.Destination?.Bucket,
							storageClass: rule.Destination?.StorageClass,
							replicationTime: rule.Destination?.ReplicationTime,
							metrics: rule.Destination?.Metrics,
						},
					}),
				),
			};
		} catch (error: any) {
			if (error.name !== "ReplicationConfigurationNotFoundError") {
				this.logger.debug(
					`Failed to get replication for bucket ${bucketName}:`,
					error.message,
				);
			}
		}

		this.logger.debug(`Completed collecting details for bucket: ${bucketName}`);
		return details;
	}
}
