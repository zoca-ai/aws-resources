import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	resourceRelationships,
	resourceTags,
	resources,
} from "@/server/db/schema";
import {
	and,
	avg,
	count,
	desc,
	eq,
	gt,
	isNull,
	max,
	or,
	sql,
	sum,
} from "drizzle-orm";
import { z } from "zod";

export const statsRouter = createTRPCRouter({
	// Get overall resource statistics
	summary: publicProcedure.query(async () => {
		// Get total resources
		const totalResourcesResult = await db
			.select({ count: count() })
			.from(resources);
		const totalResources = totalResourcesResult[0]?.count ?? 0;

		// Get resources by type
		const resourcesByType = await db
			.select({
				type: resources.resourceType,
				count: count(),
			})
			.from(resources)
			.groupBy(resources.resourceType)
			.orderBy(desc(count()));

		// Get resources by region
		const resourcesByRegion = await db
			.select({
				region: resources.region,
				count: count(),
			})
			.from(resources)
			.groupBy(resources.region)
			.orderBy(desc(count()));

		// Get public resources count
		const publicResourcesResult = await db
			.select({ count: count() })
			.from(resources)
			.where(sql`(${resources.security}->>'isPublic')::boolean = true`);
		const publicResources = publicResourcesResult[0]?.count ?? 0;

		// Get orphaned resources count (resources with no parent relationships and not VPCs)
		const orphanedResourcesResult = await db
			.select({ count: count() })
			.from(resources)
			.leftJoin(
				resourceRelationships,
				and(
					eq(resources.resourceId, resourceRelationships.sourceResourceId),
					eq(resourceRelationships.relationshipType, "parent"),
				),
			)
			.where(
				and(
					isNull(resourceRelationships.sourceResourceId),
					sql`${resources.resourceType} != 'vpc'`,
				),
			);
		const orphanedResources = orphanedResourcesResult[0]?.count ?? 0;

		return {
			totalResources,
			publicResources,
			orphanedResources,
			resourcesByType: resourcesByType.map((r) => ({
				type: r.type,
				count: r.count,
			})),
			resourcesByRegion: resourcesByRegion.map((r) => ({
				region: r.region,
				count: r.count,
			})),
			lastUpdated: new Date(),
		};
	}),

	// Get cost analysis
	costs: publicProcedure.query(async () => {
		const costByType = await db
			.select({
				type: resources.resourceType,
				totalCost: sum(resources.costEstimated),
				count: count(),
				avgCost: avg(resources.costEstimated),
			})
			.from(resources)
			.where(gt(resources.costEstimated, 0))
			.groupBy(resources.resourceType)
			.orderBy(desc(sum(resources.costEstimated)));

		const totalMonthlyCost = costByType.reduce(
			(sum, type) => sum + (Number(type.totalCost) || 0),
			0,
		);

		return {
			totalMonthlyCost,
			costByType: costByType.map((c) => ({
				type: c.type,
				totalCost: Number(c.totalCost) || 0,
				count: c.count,
				averageCost: Number(c.avgCost) || 0,
			})),
			currency: "USD",
		};
	}),

	// Get security analysis
	security: publicProcedure.query(async () => {
		// Get public resources
		const publicResources = await db
			.select({
				resourceId: resources.resourceId,
				resourceType: resources.resourceType,
				resourceName: resources.resourceName,
				region: resources.region,
			})
			.from(resources)
			.where(sql`(${resources.security}->>'isPublic')::boolean = true`)
			.limit(10);

		// Get encrypted resources count
		const encryptedResourcesResult = await db
			.select({ count: count() })
			.from(resources)
			.where(
				sql`(${resources.security}->'encryption'->>'enabled')::boolean = true`,
			);
		const encryptedResources = encryptedResourcesResult[0]?.count ?? 0;

		// Get unencrypted volumes
		const unencryptedVolumes = await db
			.select({
				resourceId: resources.resourceId,
				resourceName: resources.resourceName,
			})
			.from(resources)
			.where(
				and(
					eq(resources.resourceType, "ebs-volume"),
					sql`(${resources.security}->'encryption'->>'enabled')::boolean = false`,
				),
			)
			.limit(10);

		// Get public buckets
		const publicBuckets = await db
			.select({
				resourceId: resources.resourceId,
				resourceName: resources.resourceName,
			})
			.from(resources)
			.where(
				and(
					eq(resources.resourceType, "s3-bucket"),
					sql`(${resources.security}->>'isPublic')::boolean = true`,
				),
			);

		// Get open security groups
		const openSecurityGroups = await db
			.select({
				resourceId: resources.resourceId,
				resourceName: resources.resourceName,
			})
			.from(resources)
			.where(
				and(
					eq(resources.resourceType, "security-group"),
					sql`${resources.properties}->>'ingressRules' LIKE '%0.0.0.0/0%'`,
				),
			)
			.limit(10);

		return {
			summary: {
				publicResourcesCount: publicResources.length,
				encryptedResourcesCount: encryptedResources,
				unencryptedVolumesCount: unencryptedVolumes.length,
				publicBucketsCount: publicBuckets.length,
				openSecurityGroupsCount: openSecurityGroups.length,
			},
			publicResources,
			unencryptedVolumes,
			publicBuckets,
			openSecurityGroups,
		};
	}),

	// Get tag analysis
	tags: publicProcedure.query(async () => {
		// Get top tags with counts
		const tagAnalysis = await db
			.select({
				key: resourceTags.key,
				count: count(),
				values: sql<string[]>`array_agg(DISTINCT ${resourceTags.value})`,
			})
			.from(resourceTags)
			.groupBy(resourceTags.key)
			.orderBy(desc(count()))
			.limit(20);

		// Get untagged resources count
		const untaggedResourcesResult = await db
			.select({ count: count() })
			.from(resources)
			.leftJoin(resourceTags, eq(resources.resourceId, resourceTags.resourceId))
			.where(isNull(resourceTags.resourceId));
		const untaggedResources = untaggedResourcesResult[0]?.count ?? 0;

		return {
			topTags: tagAnalysis.map((t) => {
				const values =
					typeof t.values === "string"
						? (JSON.parse(t.values) as string[])
						: [];
				return {
					key: t.key,
					count: t.count,
					uniqueValues: values.length,
					sampleValues: values.slice(0, 5),
				};
			}),
			untaggedResourcesCount: untaggedResources,
		};
	}),

	// Get relationship analysis
	relationships: publicProcedure.query(async () => {
		// Get relationship statistics by resource type
		const relationshipStats = await db
			.select({
				resourceType: resources.resourceType,
				parentCount: count(
					sql`CASE WHEN ${resourceRelationships.relationshipType} = 'parent' THEN 1 END`,
				),
				childCount: count(
					sql`CASE WHEN ${resourceRelationships.relationshipType} = 'child' THEN 1 END`,
				),
				referenceCount: count(
					sql`CASE WHEN ${resourceRelationships.relationshipType} = 'reference' THEN 1 END`,
				),
				dependencyCount: count(
					sql`CASE WHEN ${resourceRelationships.relationshipType} = 'dependency' THEN 1 END`,
				),
			})
			.from(resources)
			.leftJoin(
				resourceRelationships,
				eq(resources.resourceId, resourceRelationships.sourceResourceId),
			)
			.groupBy(resources.resourceType)
			.orderBy(resources.resourceType);

		// Get orphaned resources
		const orphanedResources = await db
			.select({
				resourceId: resources.resourceId,
				resourceType: resources.resourceType,
				resourceName: resources.resourceName,
			})
			.from(resources)
			.leftJoin(
				resourceRelationships,
				and(
					eq(resources.resourceId, resourceRelationships.sourceResourceId),
					eq(resourceRelationships.relationshipType, "parent"),
				),
			)
			.where(
				and(
					isNull(resourceRelationships.sourceResourceId),
					sql`${resources.resourceType} NOT IN ('vpc', 'route53-hosted-zone', 'cloudfront-distribution')`,
				),
			)
			.limit(20);

		return {
			relationshipStats: relationshipStats.map((r) => ({
				type: r.resourceType,
				averageParents: Math.round((r.parentCount || 0) * 10) / 10,
				averageChildren: Math.round((r.childCount || 0) * 10) / 10,
				averageReferences: Math.round((r.referenceCount || 0) * 10) / 10,
				maxParents: r.parentCount || 0,
				maxChildren: r.childCount || 0,
				maxReferences: r.referenceCount || 0,
			})),
			orphanedResources,
			orphanedCount: orphanedResources.length,
		};
	}),

	// Get resource creation timeline
	timeline: publicProcedure.query(async () => {
		const timeline = await db
			.select({
				year: sql<number>`CAST(strftime('%Y', datetime(${resources.resourceCreatedAt}, 'unixepoch')) AS INTEGER)`,
				month: sql<number>`CAST(strftime('%m', datetime(${resources.resourceCreatedAt}, 'unixepoch')) AS INTEGER)`,
				count: count(),
				types: sql<string>`GROUP_CONCAT(DISTINCT ${resources.resourceType})`,
			})
			.from(resources)
			.where(sql`${resources.resourceCreatedAt} IS NOT NULL`)
			.groupBy(
				sql`strftime('%Y', datetime(${resources.resourceCreatedAt}, 'unixepoch'))`,
				sql`strftime('%m', datetime(${resources.resourceCreatedAt}, 'unixepoch'))`,
			)
			.orderBy(
				desc(
					sql`strftime('%Y', datetime(${resources.resourceCreatedAt}, 'unixepoch'))`,
				),
				desc(
					sql`strftime('%m', datetime(${resources.resourceCreatedAt}, 'unixepoch'))`,
				),
			)
			.limit(12);

		return {
			timeline: timeline.map((t) => ({
				year: t.year,
				month: t.month,
				count: t.count,
				typeCount: t.types ? t.types.split(",").length : 0,
			})),
		};
	}),
});
