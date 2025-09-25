import { getAWSClientConfig } from "@/server/config/aws";
import {
	DescribeRepositoriesCommand,
	type DescribeRepositoriesCommandInput,
	type DescribeRepositoriesCommandOutput,
	ECRClient,
	ListTagsForResourceCommand,
	type ListTagsForResourceCommandInput,
	type ListTagsForResourceCommandOutput,
	type Repository,
} from "@aws-sdk/client-ecr";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class ECRCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "ecr",
			name: "ECR Repositories",
			description: "Container registries",
			category: "Compute",
			icon: "Server",
			resources: ["ecr-repository"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "ecr-repository");
	}

	private async initializeClient(): Promise<void> {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new ECRClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting ECR repository collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await this.collectRepositories();
			this.logger.info(`Collected ${this.resources.length} ECR repositories`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("ECR collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectRepositories(): Promise<void> {
		let nextToken: string | undefined;

		do {
			try {
				const params: DescribeRepositoriesCommandInput = {
					nextToken,
					maxResults: 100,
				};

				const command = new DescribeRepositoriesCommand(params);
				const response: DescribeRepositoriesCommandOutput =
					await this.client.send(command);

				for (const repository of response.repositories || []) {
					if (!repository.repositoryArn || !repository.repositoryName) continue;

					const tags = await this.getRepositoryTags(repository.repositoryArn);

					const resource = this.createResourceObject({
						id: repository.repositoryArn,
						arn: repository.repositoryArn,
						name: repository.repositoryName,
						accountId: this.accountId || undefined,
						region: this.region,
						createdAt: repository.createdAt,
						tags: tags,
						properties: {
							repositoryName: repository.repositoryName,
							repositoryUri: repository.repositoryUri,
							registryId: repository.registryId,
							imageScanningConfiguration: repository.imageScanningConfiguration,
							imageTagMutability: repository.imageTagMutability,
							encryptionConfiguration: repository.encryptionConfiguration,
						},
						configuration: {
							imageScanningConfiguration: repository.imageScanningConfiguration,
							imageTagMutability: repository.imageTagMutability,
							encryptionConfiguration: repository.encryptionConfiguration,
						},
						security: {
							encryption: {
								enabled:
									repository.encryptionConfiguration?.encryptionType !==
									"AES256",
								type: repository.encryptionConfiguration?.encryptionType,
								kmsKeyId: repository.encryptionConfiguration?.kmsKey || null,
							},
							imageScanOnPush:
								repository.imageScanningConfiguration?.scanOnPush || false,
							imageTagMutability: repository.imageTagMutability,
						},
						cost: {
							estimated: this.estimateECRCost(repository),
							currency: "USD",
							billingPeriod: "monthly",
							lastUpdated: new Date(),
						},
					});

					this.resources.push(resource);
				}

				nextToken = response.nextToken;
			} catch (error: any) {
				this.logger.error(
					`Failed to collect ECR repositories: ${error.message}`,
				);
				this.errors.push(`ECR Repositories: ${error.message}`);
				break;
			}
		} while (nextToken);
	}

	private async getRepositoryTags(
		repositoryArn: string,
	): Promise<Array<{ key: string; value: string }>> {
		try {
			const params: ListTagsForResourceCommandInput = {
				resourceArn: repositoryArn,
			};

			const command = new ListTagsForResourceCommand(params);
			const response: ListTagsForResourceCommandOutput =
				await this.client.send(command);

			return this.extractTags(response.tags, "standard");
		} catch (error: any) {
			this.logger.debug(
				`Could not get tags for ${repositoryArn}: ${error.message}`,
			);
			return [];
		}
	}

	private estimateECRCost(repository: Repository): number {
		// ECR pricing is primarily based on storage
		// Base cost assumption: $0.10 per GB per month for storage
		// Assume average repository size of 1GB if we can't determine actual size
		const assumedSizeGB = 1;
		const storageCostPerGB = 0.1;

		// Data transfer costs are additional but harder to estimate without usage data
		const baseStorageCost = assumedSizeGB * storageCostPerGB;

		return baseStorageCost;
	}
}
