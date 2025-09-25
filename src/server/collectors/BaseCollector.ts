import { getAWSClientConfig, getCollectionConfig } from "@/server/config/aws";
import winston from "winston";

export interface ResourceMetadata {
	id: string;
	name: string;
	description: string;
	category: string;
	icon: string;
	resources: string[];
}

export interface BaseResourceData {
	id: string;
	arn: string;
	name?: string;
	accountId?: string;
	region?: string;
	availabilityZone?: string;
	status?: string;
	state?: string;
	createdAt?: Date | string | number;
	modifiedAt?: Date | string | number;
	tags?: Array<{ key: string; value: string }>;
	properties?: Record<string, any>;
	configuration?: Record<string, any>;
	security?: Record<string, any>;
	metrics?: Record<string, any>;
	cost?: Record<string, any>;
	cloudFormation?: Record<string, any>;
}

export interface ResourceObject {
	resourceId: string;
	resourceArn?: string;
	resourceType: string;
	resourceName?: string;
	awsAccountId?: string;
	region: string;
	availabilityZone?: string;
	status?: string;
	state?: string;
	tags: Array<{ key: string; value: string }>;
	properties: Record<string, any>;
	configuration: Record<string, any>;
	security: Record<string, any>;
	relationships: {
		parents: Array<{
			resourceId: string;
			resourceType: string;
			relationshipType: string;
			metadata?: Record<string, any>;
		}>;
		children: Array<{
			resourceId: string;
			resourceType: string;
			relationshipType: string;
			metadata?: Record<string, any>;
		}>;
		references: Array<{
			resourceId: string;
			resourceType: string;
			relationshipType: string;
			metadata?: Record<string, any>;
		}>;
		dependencies: Array<{
			resourceId: string;
			resourceType: string;
			relationshipType: string;
			metadata?: Record<string, any>;
		}>;
	};
	resourceCreatedAt?: Date | number;
	resourceModifiedAt?: Date | number;
	collectedAt: Date;
	collectorVersion: string;
	errors: string[];
	warnings: string[];
	costEstimated?: number;
	costCurrency?: string;
	costBillingPeriod?: string;
	costLastUpdated?: Date;
	cfStackId?: string;
	cfStackName?: string;
	cfLogicalId?: string;
}

export class BaseCollector {
	protected client: any;
	protected resourceType: string;
	protected region: string;
	protected resources: ResourceObject[] = [];
	protected errors: string[] = [];
	protected logger: winston.Logger;

	static getMetadata(): ResourceMetadata {
		throw new Error(
			"getMetadata() static method must be implemented by subclass",
		);
	}

	constructor(region = "us-east-1", awsClient?: any, resourceType = "unknown") {
		this.client = awsClient;
		this.resourceType = resourceType;
		this.region = region;

		this.logger = winston.createLogger({
			level: "info",
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json(),
			),
			transports: [
				new winston.transports.Console({
					format: winston.format.combine(
						winston.format.colorize(),
						winston.format.simple(),
					),
				}),
			],
		});
	}

	async collect(): Promise<ResourceObject[]> {
		throw new Error("collect() method must be implemented by subclass");
	}

	protected async collectWithRetry<T>(
		operation: () => Promise<T>,
		retries?: number,
	): Promise<T> {
		const config = getCollectionConfig();
		const maxRetries = retries || config.retryAttempts;

		for (let i = 0; i < maxRetries; i++) {
			try {
				return await operation();
			} catch (error: any) {
				this.logger.warn(`Attempt ${i + 1} failed: ${error.message}`);
				if (i === maxRetries - 1) throw error;
				await this.delay(config.retryDelay * 2 ** i);
			}
		}
		throw new Error("Should not reach here");
	}

	protected delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	protected extractTags(
		tags?:
			| Array<{ Key?: string; Value?: string; key?: string; value?: string }>
			| Record<string, string>,
		tagFormat = "standard",
	): Array<{ key: string; value: string }> {
		if (!tags) return [];

		switch (tagFormat) {
			case "standard": // [{Key: 'Name', Value: 'value'}]
				if (Array.isArray(tags)) {
					return tags
						.filter((tag) => tag && (tag.Key || tag.key))
						.map((tag) => ({
							key: tag.Key || tag.key || "",
							value: tag.Value || tag.value || "",
						}));
				}
				break;

			case "object": // {Key1: 'Value1', Key2: 'Value2'}
				if (!Array.isArray(tags)) {
					return Object.entries(tags)
						.filter(([key]) => key)
						.map(([key, value]) => ({
							key,
							value: value || "",
						}));
				}
				break;

			case "lowercase": // [{key: 'name', value: 'value'}]
				if (Array.isArray(tags)) {
					return tags
						.filter((tag) => tag?.key)
						.map((tag) => ({
							key: tag.key || "",
							value: tag.value || "",
						}));
				}
				break;

			default:
				return [];
		}

		return [];
	}

	protected createResourceObject(baseData: BaseResourceData): ResourceObject {
		return {
			resourceId: baseData.id,
			resourceArn: baseData.arn,
			resourceType: this.resourceType,
			resourceName: baseData.name,
			awsAccountId: baseData.accountId,
			region: this.region,
			availabilityZone: baseData.availabilityZone,
			status: baseData.status,
			state: baseData.state,
			resourceCreatedAt: this.parseDate(baseData.createdAt),
			resourceModifiedAt: this.parseDate(baseData.modifiedAt),
			tags: baseData.tags || [],
			properties: baseData.properties || {},
			configuration: baseData.configuration || {},
			security: baseData.security || {},
			relationships: {
				parents: [],
				children: [],
				references: [],
				dependencies: [],
			},
			collectedAt: new Date(),
			collectorVersion: "2.0.0",
			errors: [],
			warnings: [],
			costEstimated: baseData.cost?.estimated,
			costCurrency: baseData.cost?.currency || "USD",
			costBillingPeriod: baseData.cost?.billingPeriod || "monthly",
			costLastUpdated: baseData.cost?.lastUpdated,
			cfStackId: baseData.cloudFormation?.stackId,
			cfStackName: baseData.cloudFormation?.stackName,
			cfLogicalId: baseData.cloudFormation?.logicalId,
		};
	}

	protected parseDate(date?: Date | string | number): Date | undefined {
		if (!date) return undefined;
		if (date instanceof Date) return date;
		if (typeof date === "number") return new Date(date * 1000);
		return new Date(date);
	}

	protected async paginate<T>(
		operation: (params: any) => Promise<any>,
		params: any,
		dataKey: string,
		tokenKey = "NextToken",
	): Promise<T[]> {
		const allData: T[] = [];
		let nextToken: string | undefined;

		do {
			const requestParams = { ...params };
			if (nextToken) {
				requestParams[tokenKey] = nextToken;
			}

			try {
				const response = await operation(requestParams);
				const data = response[dataKey] || [];
				allData.push(...data);
				nextToken = response[tokenKey];
			} catch (error: any) {
				this.logger.error(`Pagination error: ${error.message}`);
				throw error;
			}
		} while (nextToken);

		return allData;
	}

	protected addRelationship(
		resource: ResourceObject,
		type: keyof ResourceObject["relationships"],
		relatedResourceId: string,
		relatedResourceType: string,
		metadata: Record<string, any> = {},
	): void {
		const relationshipType = type.slice(0, -1) as string; // Remove 's' from plural

		const exists = resource.relationships[type].some(
			(rel) => rel.resourceId === relatedResourceId,
		);

		if (!exists) {
			resource.relationships[type].push({
				resourceId: relatedResourceId,
				resourceType: relatedResourceType,
				relationshipType,
				metadata,
			});
		}
	}

	protected getResourceName(resource: any): string | undefined {
		// Try common name fields
		const nameFields = [
			"Name",
			"name",
			"Id",
			"Identifier",
			"DBInstanceIdentifier",
			"FunctionName",
			"GroupName",
		];

		for (const field of nameFields) {
			if (resource[field]) return resource[field];
		}

		// Check tags for Name
		if (resource.Tags) {
			const nameTag = resource.Tags.find((tag: any) => tag.Key === "Name");
			if (nameTag) return nameTag.Value;
		}

		return undefined;
	}

	protected async getAccountId(): Promise<string | null> {
		try {
			const { getAWSAccountId } = await import("@/server/config/aws");
			const config = await getAWSClientConfig();
			return await getAWSAccountId(config);
		} catch (error: any) {
			this.logger.error("Failed to get account ID:", error);
			return null;
		}
	}

	protected extractCloudFormationInfo(resource: any): Record<string, string> {
		const stackId = resource.Tags?.find(
			(tag: any) => tag.Key === "aws:cloudformation:stack-id",
		)?.Value;
		const stackName = resource.Tags?.find(
			(tag: any) => tag.Key === "aws:cloudformation:stack-name",
		)?.Value;
		const logicalId = resource.Tags?.find(
			(tag: any) => tag.Key === "aws:cloudformation:logical-id",
		)?.Value;

		const result: Record<string, string> = {};
		if (stackId) result.stackId = stackId;
		if (stackName) result.stackName = stackName;
		if (logicalId) result.logicalId = logicalId;

		return result;
	}

	protected estimateCost(resource: any): {
		estimated: number;
		currency: string;
		billingPeriod: string;
		lastUpdated: Date;
	} {
		// Simplified cost estimation - would need AWS Pricing API for accurate costs
		const monthlyCosts: Record<string, number> = {
			"t2.micro": 8.35,
			"t2.small": 16.7,
			"t2.medium": 33.41,
			"t3.micro": 7.49,
			"t3.small": 14.98,
			"t3.medium": 29.95,
			"m5.large": 69.12,
			"m5.xlarge": 138.24,
			"db.t3.micro": 12.41,
			"db.t3.small": 24.82,
			lambda: 0.2, // per 1M requests
			s3: 0.023, // per GB
			"ebs-gp3": 0.08, // per GB
		};

		let estimated = 0;

		switch (this.resourceType) {
			case "ec2-instance":
				estimated = monthlyCosts[resource.InstanceType] || 0;
				break;
			case "rds-instance":
				estimated = monthlyCosts[resource.DBInstanceClass] || 0;
				break;
			case "ebs-volume":
				estimated = (resource.Size || 0) * (monthlyCosts["ebs-gp3"] || 0);
				break;
			case "lambda-function":
				estimated = monthlyCosts.lambda || 0;
				break;
			default:
				estimated = 0;
		}

		return {
			estimated,
			currency: "USD",
			billingPeriod: "monthly",
			lastUpdated: new Date(),
		};
	}

	getResources(): ResourceObject[] {
		return this.resources;
	}

	getErrors(): string[] {
		return this.errors;
	}
}
