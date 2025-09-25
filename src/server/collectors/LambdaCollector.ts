import { getAWSClientConfig } from "@/server/config/aws";
import {
	type FunctionConfiguration,
	GetFunctionCommand,
	GetPolicyCommand,
	LambdaClient,
	ListAliasesCommand,
	ListFunctionsCommand,
	ListTagsCommand,
} from "@aws-sdk/client-lambda";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class LambdaCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "lambda",
			name: "Lambda Functions",
			description: "Serverless functions",
			category: "Compute",
			icon: "Cloud",
			resources: ["lambda-function"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "lambda-function");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new LambdaClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting Lambda resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await this.collectFunctions();
			this.logger.info(`Collected ${this.resources.length} Lambda resources`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("Lambda collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectFunctions() {
		try {
			// Use manual pagination for Lambda functions
			const functions: FunctionConfiguration[] = [];
			let nextMarker: string | undefined;

			do {
				const command = new ListFunctionsCommand({
					Marker: nextMarker,
				});
				const response = await this.client.send(command);
				functions.push(...(response.Functions || []));
				nextMarker = response.NextMarker;
			} while (nextMarker);

			for (const func of functions) {
				if (!func.FunctionName || !func.FunctionArn) continue;

				const [details, tags, policy, aliases] = await Promise.all([
					this.getFunctionDetails(func.FunctionName),
					this.getFunctionTags(func.FunctionArn),
					this.getFunctionPolicy(func.FunctionName),
					this.getFunctionAliases(func.FunctionName),
				]);

				const resource = this.createResourceObject({
					id: func.FunctionArn,
					arn: func.FunctionArn,
					name: func.FunctionName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: details?.State || func.State,
					createdAt: func.LastModified,
					modifiedAt: func.LastModified,
					tags: tags,
					properties: {
						runtime: func.Runtime,
						handler: func.Handler,
						codeSize: func.CodeSize,
						description: func.Description,
						timeout: func.Timeout,
						memorySize: func.MemorySize,
						lastModified: func.LastModified,
						codeSha256: func.CodeSha256,
						version: func.Version,
						tracingConfig: func.TracingConfig,
						revisionId: func.RevisionId,
						state: details?.State,
						stateReason: details?.StateReason,
						stateReasonCode: details?.StateReasonCode,
						packageType: func.PackageType,
						architectures: func.Architectures,
						ephemeralStorage: func.EphemeralStorage,
						aliases: aliases,
					},
					configuration: {
						runtime: func.Runtime,
						handler: func.Handler,
						role: func.Role,
						environment: func.Environment,
						deadLetterConfig: func.DeadLetterConfig,
						vpcConfig: func.VpcConfig,
						kmsKeyArn: func.KMSKeyArn,
						layers: func.Layers?.map((layer) => ({
							arn: layer.Arn,
							codeSize: layer.CodeSize,
						})),
					},
					security: {
						role: func.Role,
						kmsKeyArn: func.KMSKeyArn,
						hasPolicy: !!policy,
						vpcEnabled: !!func.VpcConfig?.VpcId,
						environment: func.Environment
							? Object.keys(func.Environment.Variables || {}).length
							: 0,
					},
					cost: {
						estimated: this.estimateLambdaCost(func),
						currency: "USD",
						billingPeriod: "monthly",
						lastUpdated: new Date(),
					},
				});

				// Add VPC relationships if applicable
				if (func.VpcConfig?.VpcId) {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:vpc/${func.VpcConfig.VpcId}`,
						"ec2-vpc",
					);
				}

				// Add subnet relationships
				func.VpcConfig?.SubnetIds?.forEach((subnetId) => {
					this.addRelationship(
						resource,
						"parents",
						`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${subnetId}`,
						"ec2-subnet",
					);
				});

				// Add security group relationships
				func.VpcConfig?.SecurityGroupIds?.forEach((sgId) => {
					this.addRelationship(
						resource,
						"references",
						`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sgId}`,
						"security-group",
					);
				});

				this.resources.push(resource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect Lambda functions:", error);
			this.errors.push(`Lambda Functions: ${error.message}`);
		}
	}

	private async getFunctionDetails(functionName: string) {
		try {
			const command = new GetFunctionCommand({ FunctionName: functionName });
			const response = await this.client.send(command);
			return response.Configuration;
		} catch (error: any) {
			this.logger.debug(
				`Failed to get function details for ${functionName}:`,
				error.message,
			);
			return null;
		}
	}

	private async getFunctionTags(functionArn: string) {
		try {
			const command = new ListTagsCommand({ Resource: functionArn });
			const response = await this.client.send(command);
			return this.extractTags(response.Tags, "object");
		} catch (error: any) {
			this.logger.debug(
				`Failed to get function tags for ${functionArn}:`,
				error.message,
			);
			return [];
		}
	}

	private async getFunctionPolicy(functionName: string) {
		try {
			const command = new GetPolicyCommand({ FunctionName: functionName });
			const response = await this.client.send(command);
			return response.Policy ? JSON.parse(response.Policy) : null;
		} catch (error: any) {
			if (error.name !== "ResourceNotFoundException") {
				this.logger.debug(
					`Failed to get function policy for ${functionName}:`,
					error.message,
				);
			}
			return null;
		}
	}

	private async getFunctionAliases(functionName: string) {
		try {
			const command = new ListAliasesCommand({ FunctionName: functionName });
			const response = await this.client.send(command);
			return (
				response.Aliases?.map((alias: any) => ({
					name: alias.Name,
					functionVersion: alias.FunctionVersion,
					description: alias.Description,
					routingConfig: alias.RoutingConfig,
				})) || []
			);
		} catch (error: any) {
			this.logger.debug(
				`Failed to get function aliases for ${functionName}:`,
				error.message,
			);
			return [];
		}
	}

	private estimateLambdaCost(func: FunctionConfiguration): number {
		// Lambda pricing calculation
		const memoryMB = func.MemorySize || 128;
		const timeoutSeconds = func.Timeout || 3;

		// Assume 1000 invocations per month as baseline
		const monthlyInvocations = 1000;

		// Request cost: $0.20 per 1M requests
		const requestCost = (monthlyInvocations / 1000000) * 0.2;

		// Compute cost: $0.0000166667 per GB-second
		const gbMemory = memoryMB / 1024;
		const computeCost =
			monthlyInvocations * timeoutSeconds * gbMemory * 0.0000166667;

		return requestCost + computeCost;
	}
}
