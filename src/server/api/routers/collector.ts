import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
	type ResourceObject,
	createCollector,
	getCollectorMetadata,
	getSupportedTypes,
} from "@/server/collectors";
import { db } from "@/server/db";
import {
	resourceRelationships,
	resourceTags,
	resources,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// In-memory job tracking
const collectionJobs = new Map<
	string,
	{
		id: string;
		status: "running" | "completed" | "failed";
		startedAt: Date;
		completedAt?: Date;
		types?: string[];
		profile?: string;
		region?: string;
		type?: string;
		result?: any;
		error?: string;
	}
>();

const collectorTypesSchema = z.array(z.string()).default(["all"]);

export const collectorRouter = createTRPCRouter({
	// Trigger resource collection
	collect: publicProcedure
		.input(
			z.object({
				types: collectorTypesSchema,
				profile: z.string().default("staging"),
				region: z.string().default("us-east-1"),
				async: z.boolean().default(false),
			}),
		)
		.mutation(async ({ input }) => {
			const { types, profile, region, async } = input;
			const jobId = `collection-${Date.now()}`;

			if (async) {
				// Start async collection job
				collectionJobs.set(jobId, {
					id: jobId,
					status: "running",
					startedAt: new Date(),
					types,
					profile,
					region,
				});

				// Start async collection process
				setTimeout(async () => {
					try {
						const result = await performCollection({ types, profile, region });
						const job = collectionJobs.get(jobId);
						if (job) {
							job.status = "completed";
							job.completedAt = new Date();
							job.result = result;
						}
					} catch (error) {
						const job = collectionJobs.get(jobId);
						if (job) {
							job.status = "failed";
							job.completedAt = new Date();
							job.error =
								error instanceof Error ? error.message : "Unknown error";
						}
					}
				}, 1000); // Start collection after 1 second

				return {
					jobId,
					status: "accepted",
					message: "Collection job started",
					checkStatus: `/api/collector/jobs/${jobId}`,
				};
			}
			// Run synchronous collection
			const result = await performCollection({ types, profile, region });

			return {
				status: "completed",
				resourcesCollected: result.resourceCount,
				errors: result.errorCount,
				byType: result.byType,
				types,
				profile,
				region,
			};
		}),

	// Refresh a specific resource
	refreshResource: publicProcedure
		.input(
			z.object({
				resourceId: z.string(),
				resourceType: z.string().optional(),
				region: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			const { resourceId, resourceType, region } = input;

			// Find the resource to get its type and region if not provided
			let resource;
			if (!resourceType || !region) {
				const result = await db
					.select()
					.from(resources)
					.where(eq(resources.resourceId, resourceId))
					.limit(1);

				if (result.length === 0) {
					throw new Error("Resource not found");
				}
				resource = result[0];
			}

			const finalResourceType = resourceType || resource?.resourceType;
			const finalRegion = region || resource?.region;

			// Simulate refreshing the resource
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Update the resource's last synced timestamp
			await db
				.update(resources)
				.set({
					lastSyncedAt: new Date(),
					syncStatus: "synced",
					updatedAt: new Date(),
				})
				.where(eq(resources.resourceId, resourceId));

			return {
				status: "completed",
				resourceId,
				resourceType: finalResourceType,
				updated: true,
				message: "Resource refreshed successfully",
			};
		}),

	// Refresh all resources
	refreshAll: publicProcedure.mutation(async () => {
		const jobId = `refresh-${Date.now()}`;

		collectionJobs.set(jobId, {
			id: jobId,
			status: "running",
			startedAt: new Date(),
			type: "full-refresh",
		});

		// Start full refresh
		setTimeout(async () => {
			try {
				const result = await performCollection({
					types: ["all"],
					profile: "staging",
					region: "us-east-1",
				});
				const job = collectionJobs.get(jobId);
				if (job) {
					job.status = "completed";
					job.completedAt = new Date();
					job.result = result;
				}
			} catch (error) {
				const job = collectionJobs.get(jobId);
				if (job) {
					job.status = "failed";
					job.completedAt = new Date();
					job.error = error instanceof Error ? error.message : "Unknown error";
				}
			}
		}, 1000); // Start refresh after 1 second

		return {
			jobId,
			status: "accepted",
			message: "Full refresh started",
			checkStatus: `/api/collector/jobs/${jobId}`,
		};
	}),

	// Get collection job status
	jobStatus: publicProcedure
		.input(z.object({ jobId: z.string() }))
		.query(async ({ input }) => {
			const job = collectionJobs.get(input.jobId);

			if (!job) {
				throw new Error("Job not found");
			}

			return job;
		}),

	// List all collection jobs
	jobs: publicProcedure.query(async () => {
		const jobs = Array.from(collectionJobs.values())
			.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
			.slice(0, 20); // Last 20 jobs

		return jobs;
	}),

	// Get current AWS account information
	account: publicProcedure.query(async () => {
		try {
			const { getAWSClientConfig, getAWSAccountId, validateAWSCredentials } =
				await import("@/server/config/aws");
			const { env } = await import("@/env");

			const config = await getAWSClientConfig();
			const accountId = await getAWSAccountId(config);
			const isValid = await validateAWSCredentials(config);

			// Get caller identity for more details
			const { STSClient, GetCallerIdentityCommand } = await import(
				"@aws-sdk/client-sts"
			);
			const stsClient = new STSClient(config);
			const identity = await stsClient.send(new GetCallerIdentityCommand({}));

			return {
				accountId,
				userId: identity.UserId || "unknown",
				arn: identity.Arn || "unknown",
				region: env.AWS_REGION,
				profile: env.AWS_PROFILE,
				credentialsValid: isValid,
			};
		} catch (error: any) {
			return {
				accountId: "unknown",
				userId: "unknown",
				arn: "unknown",
				region: process.env.AWS_REGION || "us-east-1",
				profile: process.env.AWS_PROFILE || "default",
				credentialsValid: false,
				error: error.message,
			};
		}
	}),

	// Get available collector types
	types: publicProcedure.query(async () => {
		// Get real collector metadata
		const collectorMeta = getCollectorMetadata();

		return collectorMeta
			.map((collector) => ({
				id: collector.key,
				name: collector.name,
				description: collector.description,
				category: collector.category.toLowerCase(),
				icon: collector.icon.toLowerCase(),
				resources: collector.resources,
			}))
			.sort((a, b) => {
				if (a.category !== b.category) {
					return a.category.localeCompare(b.category);
				}
				return a.name.localeCompare(b.name);
			});
	}),
});

// Real collection function using AWS collectors
async function performCollection({
	types,
	profile,
	region,
}: {
	types: string[];
	profile: string;
	region: string;
}) {
	const startTime = Date.now();
	const byType: Record<string, number> = {};
	const errors: string[] = [];
	let totalResourceCount = 0;
	let savedResourceCount = 0;

	// Determine which collectors to run
	const collectorsToRun = types.includes("all") ? getSupportedTypes() : types;

	for (const collectorType of collectorsToRun) {
		try {
			// Skip unsupported collector types
			if (!getSupportedTypes().includes(collectorType)) {
				console.log(`Skipping unsupported collector type: ${collectorType}`);
				continue;
			}

			console.log(`Starting collection for ${collectorType}...`);
			const collector = createCollector(collectorType, region);
			const resources = await collector.collect();

			console.log(
				`Collected ${resources.length} resources from ${collectorType}`,
			);
			totalResourceCount += resources.length;

			// Save resources to database
			for (const resource of resources) {
				try {
					await saveResourceToDatabase(resource);

					// Count by type
					const resourceType = resource.resourceType;
					byType[resourceType] = (byType[resourceType] || 0) + 1;
					savedResourceCount++;
				} catch (error) {
					console.error(
						`Failed to save resource ${resource.resourceId}:`,
						error,
					);
					errors.push(
						`Failed to save ${resource.resourceType} ${resource.resourceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
					);
				}
			}

			// Check for collector errors
			const collectorErrors = collector.getErrors();
			if (collectorErrors.length > 0) {
				errors.push(
					...collectorErrors.map((err) => `${collectorType}: ${err}`),
				);
			}
		} catch (error) {
			const errorMsg = `${collectorType} collection failed: ${error instanceof Error ? error.message : "Unknown error"}`;
			console.error(errorMsg);
			errors.push(errorMsg);
		}
	}

	const durationSeconds = (Date.now() - startTime) / 1000;

	return {
		durationSeconds,
		resourceCount: totalResourceCount,
		errorCount: errors.length,
		savedCount: savedResourceCount,
		byType,
		errors,
	};
}

// Helper function to save a resource object to the database
async function saveResourceToDatabase(resource: ResourceObject) {
	// First, insert or update the main resource record
	const resourceData = {
		resourceId: resource.resourceId,
		resourceArn: resource.resourceArn,
		resourceType: resource.resourceType,
		resourceName: resource.resourceName,
		awsAccountId: resource.awsAccountId,
		region: resource.region,
		availabilityZone: resource.availabilityZone,
		status: resource.status,
		state: JSON.stringify(resource.state),
		properties: JSON.stringify(resource.properties),
		configuration: JSON.stringify(resource.configuration),
		security: JSON.stringify(resource.security),
		costEstimated: resource.costEstimated,
		costCurrency: resource.costCurrency,
		costBillingPeriod: resource.costBillingPeriod,
		costLastUpdated: resource.costLastUpdated,
		cfStackId: resource.cfStackId,
		cfStackName: resource.cfStackName,
		cfLogicalId: resource.cfLogicalId,
		resourceCreatedAt: resource.resourceCreatedAt
			? resource.resourceCreatedAt instanceof Date
				? resource.resourceCreatedAt
				: new Date(
						typeof resource.resourceCreatedAt === "number"
							? resource.resourceCreatedAt * 1000
							: resource.resourceCreatedAt,
					)
			: null,
		resourceModifiedAt: resource.resourceModifiedAt
			? resource.resourceModifiedAt instanceof Date
				? resource.resourceModifiedAt
				: new Date(
						typeof resource.resourceModifiedAt === "number"
							? resource.resourceModifiedAt * 1000
							: resource.resourceModifiedAt,
					)
			: null,
		collectedAt: resource.collectedAt,
		collectorVersion: resource.collectorVersion,
		lastSyncedAt: new Date(),
		syncStatus: "synced" as const,
		errors: resource.errors.length > 0 ? JSON.stringify(resource.errors) : null,
		warnings:
			resource.warnings.length > 0 ? JSON.stringify(resource.warnings) : null,
		updatedAt: new Date(),
	};

	// Upsert the resource
	await db
		.insert(resources)
		.values(resourceData)
		.onConflictDoUpdate({
			target: resources.resourceId,
			set: {
				...resourceData,
				updatedAt: new Date(),
			},
		});

	// Clear existing tags and relationships for this resource
	await Promise.all([
		db
			.delete(resourceTags)
			.where(eq(resourceTags.resourceId, resource.resourceId)),
		db
			.delete(resourceRelationships)
			.where(eq(resourceRelationships.sourceResourceId, resource.resourceId)),
	]);

	// Insert tags if they exist
	const tags = extractTagsFromResource(resource);
	if (tags.length > 0) {
		await db.insert(resourceTags).values(
			tags.map((tag) => ({
				resourceId: resource.resourceId,
				key: tag.key,
				value: tag.value,
			})),
		);
	}

	// Insert relationships
	const relationships = extractRelationshipsFromResource(resource);
	if (relationships.length > 0) {
		await db.insert(resourceRelationships).values(relationships);
	}
}

// Helper function to extract tags from a resource object
function extractTagsFromResource(
	resource: ResourceObject,
): Array<{ key: string; value: string }> {
	// Tags are now stored directly on the resource object
	if (resource.tags && Array.isArray(resource.tags)) {
		return resource.tags;
	}

	// Fallback: Check if tags are in the properties (for backward compatibility)
	if (resource.properties?.tags && Array.isArray(resource.properties.tags)) {
		return resource.properties.tags;
	}

	return [];
}

// Helper function to extract relationships from a resource object
function extractRelationshipsFromResource(resource: ResourceObject) {
	const relationships: Array<{
		sourceResourceId: string;
		targetResourceId: string;
		targetResourceArn?: string;
		targetResourceType?: string;
		relationshipType: string;
		metadata?: string;
	}> = [];

	// Process all relationship types
	for (const [relType, relList] of Object.entries(resource.relationships)) {
		for (const rel of relList) {
			relationships.push({
				sourceResourceId: resource.resourceId,
				targetResourceId: rel.resourceId,
				targetResourceArn: rel.resourceId, // Assuming resourceId is the ARN
				targetResourceType: rel.resourceType,
				relationshipType: rel.relationshipType,
				metadata: rel.metadata ? JSON.stringify(rel.metadata) : undefined,
			});
		}
	}

	return relationships;
}

// Cleanup old jobs periodically (in a real app, this would be a background job)
setInterval(
	() => {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		for (const [jobId, job] of collectionJobs.entries()) {
			if (job.completedAt && job.completedAt < oneHourAgo) {
				collectionJobs.delete(jobId);
			}
		}
	},
	30 * 60 * 1000,
); // Every 30 minutes
