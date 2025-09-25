import { getAWSClientConfig } from "@/server/config/aws";
import {
	type Cluster,
	DescribeClustersCommand,
	DescribeServicesCommand,
	ECSClient,
	ListClustersCommand,
	ListServicesCommand,
	ListTagsForResourceCommand,
	type Service,
	type Tag,
} from "@aws-sdk/client-ecs";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class ECSCollector extends BaseCollector {
	private accountId: string | null = null;

	static getMetadata(): ResourceMetadata {
		return {
			id: "ecs",
			name: "ECS Services",
			description: "Container services",
			category: "Compute",
			icon: "Server",
			resources: ["ecs-cluster", "ecs-service"],
		};
	}

	constructor(region = "us-east-1") {
		// Client will be initialized in collect() with proper credentials
		super(region, null, "ecs-cluster");
	}

	private async initializeClient() {
		if (!this.client) {
			const config = await getAWSClientConfig();
			this.client = new ECSClient({
				region: config.region,
				credentials: config.credentials,
			});
		}
	}

	async collect() {
		this.logger.info("Starting ECS resource collection...");

		// Initialize client with proper credentials
		await this.initializeClient();
		this.accountId = await this.getAccountId();

		try {
			await this.collectClusters();

			this.logger.info(`Collected ${this.resources.length} ECS resources`);
			return this.resources;
		} catch (error: any) {
			this.logger.error("ECS collection failed:", error);
			this.errors.push(error.message);
			throw error;
		}
	}

	private async collectClusters() {
		try {
			const clustersResponse = await this.client.send(
				new ListClustersCommand({}),
			);
			const clusterArns = clustersResponse.clusterArns || [];

			if (clusterArns.length === 0) return;

			const clustersDetails = await this.client.send(
				new DescribeClustersCommand({
					clusters: clusterArns,
					include: [
						"ATTACHMENTS",
						"CONFIGURATIONS",
						"SETTINGS",
						"STATISTICS",
						"TAGS",
					],
				}),
			);

			for (const cluster of clustersDetails.clusters || []) {
				if (!cluster.clusterArn || !cluster.clusterName) continue;

				// Fetch tags separately using ListTagsForResource
				let tags: Array<{ key: string; value: string }> = [];
				try {
					const tagsResponse = await this.client.send(
						new ListTagsForResourceCommand({
							resourceArn: cluster.clusterArn,
						}),
					);
					// ListTagsForResource returns tags in lowercase format
					tags = this.extractTags(tagsResponse.tags, "lowercase");
				} catch (tagError: any) {
					this.logger.warn(
						`Failed to fetch tags for cluster ${cluster.clusterName}: ${tagError.message}`,
					);
					tags = this.extractTags(cluster.tags); // Fallback to inline tags if any
				}

				const clusterResource = this.createResourceObject({
					id: cluster.clusterArn,
					arn: cluster.clusterArn,
					name: cluster.clusterName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: cluster.status,
					tags: tags,
					properties: {
						clusterName: cluster.clusterName,
						status: cluster.status,
						runningTasksCount: cluster.runningTasksCount,
						pendingTasksCount: cluster.pendingTasksCount,
						activeServicesCount: cluster.activeServicesCount,
						registeredContainerInstancesCount:
							cluster.registeredContainerInstancesCount,
						statistics: cluster.statistics,
						capacityProviders: cluster.capacityProviders,
						defaultCapacityProviderStrategy:
							cluster.defaultCapacityProviderStrategy,
						attachments: cluster.attachments,
					},
					configuration: {
						settings: cluster.settings,
						configuration: cluster.configuration,
					},
					cloudFormation: this.extractCloudFormationInfo({
						Tags: cluster.tags,
					}),
				});

				clusterResource.resourceType = "ecs-cluster";
				this.resources.push(clusterResource);

				// Collect services for this cluster
				await this.collectServices(cluster.clusterArn, clusterResource);
			}
		} catch (error: any) {
			this.logger.error("Failed to collect ECS clusters:", error);
			this.errors.push(`ECS Clusters: ${error.message}`);
		}
	}

	private async collectServices(clusterArn: string, clusterResource: any) {
		try {
			this.logger.info(`Collecting services for cluster: ${clusterArn}`);

			// Collect services with manual pagination
			const allServiceArns: string[] = [];
			let nextToken: string | undefined;

			do {
				const listParams: any = { cluster: clusterArn };
				if (nextToken) {
					listParams.nextToken = nextToken;
				}

				const servicesResponse = await this.client.send(
					new ListServicesCommand(listParams),
				);
				const serviceArns = servicesResponse.serviceArns || [];
				allServiceArns.push(...serviceArns);
				nextToken = servicesResponse.nextToken;

				this.logger.debug(
					`Batch: found ${serviceArns.length} services, nextToken: ${nextToken}`,
				);
			} while (nextToken);

			this.logger.info(
				`Found ${allServiceArns.length} services in cluster ${clusterArn}`,
			);

			if (allServiceArns.length === 0) return;

			// Process services in batches to avoid API limits (max 10 services per describe call)
			const batchSize = 10;
			const allServices: Service[] = [];

			for (let i = 0; i < allServiceArns.length; i += batchSize) {
				const batch = allServiceArns.slice(i, i + batchSize);
				const servicesDetails = await this.client.send(
					new DescribeServicesCommand({
						cluster: clusterArn,
						services: batch,
						include: ["TAGS"],
					}),
				);

				if (servicesDetails.services) {
					allServices.push(...servicesDetails.services);
				}
			}

			for (const service of allServices) {
				if (!service.serviceArn || !service.serviceName) continue;

				// Fetch tags separately using ListTagsForResource
				let tags: Array<{ key: string; value: string }> = [];
				try {
					const tagsResponse = await this.client.send(
						new ListTagsForResourceCommand({
							resourceArn: service.serviceArn,
						}),
					);
					// ListTagsForResource returns tags in lowercase format
					tags = this.extractTags(tagsResponse.tags, "lowercase");
				} catch (tagError: any) {
					this.logger.warn(
						`Failed to fetch tags for service ${service.serviceName}: ${tagError.message}`,
					);
					tags = this.extractTags(service.tags); // Fallback to inline tags if any
				}

				const serviceResource = this.createResourceObject({
					id: service.serviceArn,
					arn: service.serviceArn,
					name: service.serviceName,
					accountId: this.accountId || undefined,
					region: this.region,
					status: service.status,
					createdAt: service.createdAt,
					tags: tags,
					properties: {
						serviceName: service.serviceName,
						status: service.status,
						taskDefinition: service.taskDefinition,
						desiredCount: service.desiredCount,
						runningCount: service.runningCount,
						pendingCount: service.pendingCount,
						launchType: service.launchType,
						platformVersion: service.platformVersion,
						platformFamily: service.platformFamily,
						deployments: service.deployments,
						roleArn: service.roleArn,
						createdBy: service.createdBy,
						healthCheckGracePeriodSeconds:
							service.healthCheckGracePeriodSeconds,
						schedulingStrategy: service.schedulingStrategy,
						deploymentController: service.deploymentController,
						propagateTags: service.propagateTags,
						enableECSManagedTags: service.enableECSManagedTags,
						enableExecuteCommand: service.enableExecuteCommand,
					},
					configuration: {
						loadBalancers: service.loadBalancers,
						serviceRegistries: service.serviceRegistries,
						networkConfiguration: service.networkConfiguration,
						placementConstraints: service.placementConstraints,
						placementStrategy: service.placementStrategy,
						capacityProviderStrategy: service.capacityProviderStrategy,
					},
					cloudFormation: this.extractCloudFormationInfo({
						Tags: service.tags,
					}),
				});

				serviceResource.resourceType = "ecs-service";

				// Add relationship to cluster
				this.addRelationship(
					serviceResource,
					"parents",
					clusterResource.resourceId,
					"ecs-cluster",
				);

				// Add VPC relationships if networkConfiguration exists
				if (service.networkConfiguration?.awsvpcConfiguration?.subnets) {
					service.networkConfiguration.awsvpcConfiguration.subnets.forEach(
						(subnetId) => {
							this.addRelationship(
								serviceResource,
								"parents",
								`arn:aws:ec2:${this.region}:${this.accountId}:subnet/${subnetId}`,
								"ec2-subnet",
							);
						},
					);
				}

				// Add security group relationships
				if (service.networkConfiguration?.awsvpcConfiguration?.securityGroups) {
					service.networkConfiguration.awsvpcConfiguration.securityGroups.forEach(
						(sgId) => {
							this.addRelationship(
								serviceResource,
								"references",
								`arn:aws:ec2:${this.region}:${this.accountId}:security-group/${sgId}`,
								"security-group",
							);
						},
					);
				}

				this.resources.push(serviceResource);
				this.logger.debug(
					`Added ECS service: ${service.serviceName} (${service.serviceArn})`,
				);
			}

			this.logger.info(
				`Successfully collected ${allServices.length} services for cluster ${clusterArn}`,
			);
		} catch (error: any) {
			this.logger.error(
				`Failed to collect services for cluster ${clusterArn}:`,
				error,
			);
			this.errors.push(`ECS Services: ${error.message}`);
		}
	}
}
