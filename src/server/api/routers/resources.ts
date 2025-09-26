import { MIGRATION_CATEGORY_VALUES } from "@/constants/migration";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import {
  migrationMappingTargets,
  migrationMappings,
  resourceRelationships,
  resourceTags,
  resources,
} from "@/server/db/schema";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(250).default(50),
});

const resourceFiltersSchema = z
  .object({
    type: z.string().optional(),
    region: z.string().optional(),
    tag: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    isPublic: z.boolean().optional(),
    category: z
      .enum(MIGRATION_CATEGORY_VALUES as [string, ...string[]])
      .optional(),
  })
  .merge(paginationSchema);

const categoryStatsSchema = z.object({
  old: z.number(),
  new: z.number(),
  uncategorized: z.number(),
});

export const resourcesRouter = createTRPCRouter({
  // Get all resources with filters and pagination
  list: publicProcedure
    .input(resourceFiltersSchema)
    .query(async ({ input }) => {
      const {
        page,
        limit,
        type,
        region,
        tag,
        search,
        status,
        isPublic,
        category,
      } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions = [];

      if (type) conditions.push(eq(resources.resourceType, type));
      if (region) conditions.push(eq(resources.region, region));
      if (status) conditions.push(eq(resources.status, status));
      if (category) conditions.push(eq(resources.migrationCategory, category));

      // Handle public resources filter
      if (isPublic !== undefined) {
        conditions.push(
          sql`(${resources.security}->>'isPublic')::boolean = ${isPublic}`,
        );
      }

      // Handle tag filter
      if (tag) {
        const [key, value] = tag.split(":");
        if (value && key) {
          // Find resources with specific key-value pair
          const tagSubquery = db
            .select({ resourceId: resourceTags.resourceId })
            .from(resourceTags)
            .where(
              and(eq(resourceTags.key, key), eq(resourceTags.value, value)),
            );
          conditions.push(inArray(resources.resourceId, tagSubquery));
        } else if (key) {
          // Find resources with specific key
          const tagSubquery = db
            .select({ resourceId: resourceTags.resourceId })
            .from(resourceTags)
            .where(eq(resourceTags.key, key));
          conditions.push(inArray(resources.resourceId, tagSubquery));
        }
      }

      // Handle search
      if (search) {
        const searchCondition = or(
          like(resources.resourceName, `%${search}%`),
          like(resources.resourceId, `%${search}%`),
          like(resources.resourceArn, `%${search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get resources and total count
      const [resourcesList, totalResult] = await Promise.all([
        db
          .select()
          .from(resources)
          .where(whereCondition)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(resources.collectedAt)),
        db.select({ count: count() }).from(resources).where(whereCondition),
      ]);

      const total = totalResult[0]?.count ?? 0;

      // Fetch tags for each resource
      const resourcesWithTags = await Promise.all(
        resourcesList.map(async (resource) => {
          const tags = await db
            .select({
              key: resourceTags.key,
              value: resourceTags.value,
            })
            .from(resourceTags)
            .where(eq(resourceTags.resourceId, resource.resourceId));

          return {
            ...resource,
            // Parse JSON fields if they're strings
            properties:
              typeof resource.properties === "string"
                ? JSON.parse(resource.properties)
                : resource.properties,
            configuration:
              typeof resource.configuration === "string"
                ? JSON.parse(resource.configuration)
                : resource.configuration,
            security:
              typeof resource.security === "string"
                ? JSON.parse(resource.security)
                : resource.security,
            state:
              typeof resource.state === "string"
                ? JSON.parse(resource.state)
                : resource.state,
            tags,
          };
        }),
      );

      return {
        resources: resourcesWithTags,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }),

  // Get resources grouped by migration category
  categories: publicProcedure.query(async () => {
    const result = await db
      .select({
        category: resources.migrationCategory,
        count: count(),
      })
      .from(resources)
      .groupBy(resources.migrationCategory);

    const stats = {
      old: 0,
      new: 0,
      uncategorized: 0,
    };

    result.forEach((item) => {
      if (item.category === "old") {
        stats.old = item.count;
      } else if (item.category === "new") {
        stats.new = item.count;
      } else {
        // Both explicit "uncategorized" and null/undefined count as uncategorized
        stats.uncategorized += item.count;
      }
    });

    return stats;
  }),

  // Get resources by specific category with filters
  categorized: publicProcedure
    .input(
      z.object({
        category: z.enum(MIGRATION_CATEGORY_VALUES as [string, ...string[]]),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(250).default(50),
        search: z.string().optional(),
        type: z.string().optional(),
        region: z.string().optional(),
        mappingStatus: z.enum(["all", "mapped", "unmapped"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { category, page, limit, search, type, region, mappingStatus } = input;
      const offset = (page - 1) * limit;

      // Handle uncategorized resources: both explicit "uncategorized" and null/undefined
      const categoryConditions =
        category === "uncategorized"
          ? or(
              eq(resources.migrationCategory, "uncategorized"),
              isNull(resources.migrationCategory),
            )
          : eq(resources.migrationCategory, category);

      const conditions = [categoryConditions];

      if (type && type !== "all")
        conditions.push(eq(resources.resourceType, type));
      if (region && region !== "all")
        conditions.push(eq(resources.region, region));

      if (search) {
        const searchCondition = or(
          like(resources.resourceName, `%${search}%`),
          like(resources.resourceId, `%${search}%`),
          like(resources.resourceArn, `%${search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      // Handle mapping status filtering
      if (mappingStatus && mappingStatus !== "all") {
        if (mappingStatus === "mapped") {
          // Resource is mapped (exists in migration_mappings as source OR is a target)
          const mappedAsSourceSubquery = db
            .select({ resourceId: migrationMappings.sourceResourceId })
            .from(migrationMappings);

          const mappedAsTargetSubquery = db
            .select({ resourceId: migrationMappingTargets.resourceId })
            .from(migrationMappingTargets);

          conditions.push(
            or(
              inArray(resources.resourceId, mappedAsSourceSubquery),
              inArray(resources.resourceId, mappedAsTargetSubquery)
            )
          );
        } else if (mappingStatus === "unmapped") {
          // Resource is NOT mapped (does NOT exist in migration_mappings as source OR target)
          const mappedAsSourceSubquery = db
            .select({ resourceId: migrationMappings.sourceResourceId })
            .from(migrationMappings);

          const mappedAsTargetSubquery = db
            .select({ resourceId: migrationMappingTargets.resourceId })
            .from(migrationMappingTargets);

          conditions.push(
            and(
              sql`${resources.resourceId} NOT IN (${mappedAsSourceSubquery})`,
              sql`${resources.resourceId} NOT IN (${mappedAsTargetSubquery})`
            )
          );
        }
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [resourcesList, totalResult] = await Promise.all([
        db
          .select()
          .from(resources)
          .where(whereCondition)
          .limit(limit)
          .offset(offset)
          .orderBy(resources.resourceType, resources.resourceName),
        db.select({ count: count() }).from(resources).where(whereCondition),
      ]);

      const total = totalResult[0]?.count ?? 0;

      // Fetch tags for each resource
      const resourcesWithTags = await Promise.all(
        resourcesList.map(async (resource) => {
          const tags = await db
            .select({
              key: resourceTags.key,
              value: resourceTags.value,
            })
            .from(resourceTags)
            .where(eq(resourceTags.resourceId, resource.resourceId));

          return {
            ...resource,
            // Parse JSON fields if they're strings
            properties:
              typeof resource.properties === "string"
                ? JSON.parse(resource.properties)
                : resource.properties,
            configuration:
              typeof resource.configuration === "string"
                ? JSON.parse(resource.configuration)
                : resource.configuration,
            security:
              typeof resource.security === "string"
                ? JSON.parse(resource.security)
                : resource.security,
            state:
              typeof resource.state === "string"
                ? JSON.parse(resource.state)
                : resource.state,
            tags,
          };
        }),
      );

      return {
        resources: resourcesWithTags,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }),

  // Get resources by specific category with infinite scrolling and filters
  categorizedInfinite: publicProcedure
    .input(
      z.object({
        category: z.enum(MIGRATION_CATEGORY_VALUES as [string, ...string[]]),
        limit: z.number().min(1).max(250).default(50),
        cursor: z.string().optional(),
        search: z.string().optional(),
        type: z.string().optional(),
        region: z.string().optional(),
        mappingStatus: z.enum(["all", "mapped", "unmapped"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { category, limit, cursor, search, type, region, mappingStatus } = input;

      // Handle uncategorized resources: both explicit "uncategorized" and null/undefined
      const categoryConditions =
        category === "uncategorized"
          ? or(
              eq(resources.migrationCategory, "uncategorized"),
              isNull(resources.migrationCategory),
            )
          : eq(resources.migrationCategory, category);

      const conditions = [categoryConditions];

      if (type && type !== "all")
        conditions.push(eq(resources.resourceType, type));
      if (region && region !== "all")
        conditions.push(eq(resources.region, region));

      if (search) {
        const searchCondition = or(
          like(resources.resourceName, `%${search}%`),
          like(resources.resourceId, `%${search}%`),
          like(resources.resourceArn, `%${search}%`),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      // Handle cursor for pagination
      if (cursor) {
        conditions.push(sql`${resources.id} > ${cursor}`);
      }

      // Handle mapping status filtering
      if (mappingStatus && mappingStatus !== "all") {
        if (mappingStatus === "mapped") {
          // Resource is mapped (exists in migration_mappings as source OR is a target)
          const mappedAsSourceSubquery = db
            .select({ resourceId: migrationMappings.sourceResourceId })
            .from(migrationMappings);

          const mappedAsTargetSubquery = db
            .select({ resourceId: migrationMappingTargets.resourceId })
            .from(migrationMappingTargets);

          conditions.push(
            or(
              inArray(resources.resourceId, mappedAsSourceSubquery),
              inArray(resources.resourceId, mappedAsTargetSubquery)
            )
          );
        } else if (mappingStatus === "unmapped") {
          // Resource is NOT mapped (does NOT exist in migration_mappings as source OR target)
          const mappedAsSourceSubquery = db
            .select({ resourceId: migrationMappings.sourceResourceId })
            .from(migrationMappings);

          const mappedAsTargetSubquery = db
            .select({ resourceId: migrationMappingTargets.resourceId })
            .from(migrationMappingTargets);

          conditions.push(
            and(
              sql`${resources.resourceId} NOT IN (${mappedAsSourceSubquery})`,
              sql`${resources.resourceId} NOT IN (${mappedAsTargetSubquery})`
            )
          );
        }
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const resourcesList = await db
        .select()
        .from(resources)
        .where(whereCondition)
        .limit(limit + 1) // Fetch one extra to determine if there's a next page
        .orderBy(resources.id, resources.resourceType, resources.resourceName);

      let nextCursor: string | undefined = undefined;
      if (resourcesList.length > limit) {
        const nextItem = resourcesList.pop()!;
        nextCursor = nextItem.id.toString();
      }

      // Fetch tags for each resource
      const resourcesWithTags = await Promise.all(
        resourcesList.map(async (resource) => {
          const tags = await db
            .select({
              key: resourceTags.key,
              value: resourceTags.value,
            })
            .from(resourceTags)
            .where(eq(resourceTags.resourceId, resource.resourceId));

          return {
            ...resource,
            // Parse JSON fields if they're strings
            properties:
              typeof resource.properties === "string"
                ? JSON.parse(resource.properties)
                : resource.properties,
            configuration:
              typeof resource.configuration === "string"
                ? JSON.parse(resource.configuration)
                : resource.configuration,
            security:
              typeof resource.security === "string"
                ? JSON.parse(resource.security)
                : resource.security,
            state:
              typeof resource.state === "string"
                ? JSON.parse(resource.state)
                : resource.state,
            tags,
          };
        }),
      );

      return {
        resources: resourcesWithTags,
        nextCursor
      };
    }),

  // Get all unique resource types with counts
  types: publicProcedure.query(async () => {
    const types = await db
      .select({
        type: resources.resourceType,
        count: count(),
      })
      .from(resources)
      .groupBy(resources.resourceType)
      .orderBy(desc(count()));

    return types;
  }),

  // Get all unique regions with counts
  regions: publicProcedure.query(async () => {
    const regions = await db
      .select({
        region: resources.region,
        count: count(),
      })
      .from(resources)
      .groupBy(resources.region)
      .orderBy(desc(count()));

    return regions;
  }),

  // Get specific resource by ID
  byId: publicProcedure
    .input(z.object({ resourceId: z.string() }))
    .query(async ({ input }) => {
      const resource = await db
        .select()
        .from(resources)
        .where(eq(resources.resourceId, input.resourceId))
        .limit(1);

      if (resource.length === 0) {
        throw new Error("Resource not found");
      }

      const resourceData = resource[0]!;

      // Fetch tags for this resource
      const tags = await db
        .select({
          key: resourceTags.key,
          value: resourceTags.value,
        })
        .from(resourceTags)
        .where(eq(resourceTags.resourceId, input.resourceId));

      return {
        ...resourceData,
        // Parse JSON fields if they're strings
        properties:
          typeof resourceData.properties === "string"
            ? JSON.parse(resourceData.properties)
            : resourceData.properties,
        configuration:
          typeof resourceData.configuration === "string"
            ? JSON.parse(resourceData.configuration)
            : resourceData.configuration,
        security:
          typeof resourceData.security === "string"
            ? JSON.parse(resourceData.security)
            : resourceData.security,
        state:
          typeof resourceData.state === "string"
            ? JSON.parse(resourceData.state)
            : resourceData.state,
        tags,
      };
    }),

  // Get resource relationships
  relationships: publicProcedure
    .input(z.object({ resourceId: z.string() }))
    .query(async ({ input }) => {
      const resource = await db
        .select()
        .from(resources)
        .where(eq(resources.resourceId, input.resourceId))
        .limit(1);

      if (resource.length === 0) {
        throw new Error("Resource not found");
      }

      // Get relationships
      const relationships = await db
        .select()
        .from(resourceRelationships)
        .where(eq(resourceRelationships.sourceResourceId, input.resourceId));

      // Group by relationship type
      const groupedRelationships = {
        parents: relationships.filter((r) => r.relationshipType === "parent"),
        children: relationships.filter((r) => r.relationshipType === "child"),
        references: relationships.filter(
          (r) => r.relationshipType === "reference",
        ),
        dependencies: relationships.filter(
          (r) => r.relationshipType === "dependency",
        ),
      };

      return {
        resource: {
          resourceId: resource[0]?.resourceId,
          resourceName: resource[0]?.resourceName,
          resourceType: resource[0]?.resourceType,
        },
        relationships: groupedRelationships,
      };
    }),

  // Update resource tags
  updateTags: publicProcedure
    .input(
      z.object({
        resourceId: z.string(),
        tags: z.array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const { resourceId, tags } = input;

      // First check if resource exists
      const existingResource = await db
        .select()
        .from(resources)
        .where(eq(resources.resourceId, resourceId))
        .limit(1);

      if (existingResource.length === 0) {
        throw new Error("Resource not found");
      }

      // Delete existing tags for this resource
      await db
        .delete(resourceTags)
        .where(eq(resourceTags.resourceId, resourceId));

      // Insert new tags
      if (tags.length > 0) {
        await db.insert(resourceTags).values(
          tags.map((tag) => ({
            resourceId,
            key: tag.key,
            value: tag.value,
          })),
        );
      }

      // Update resource metadata
      await db
        .update(resources)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(resources.resourceId, resourceId));

      return { message: "Resource updated successfully" };
    }),

  // Categorize a resource for migration
  categorize: publicProcedure
    .input(
      z.object({
        resourceId: z.string(),
        category: z.enum(MIGRATION_CATEGORY_VALUES as [string, ...string[]]),
        notes: z.string().optional(),
        categorizedBy: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { resourceId, category, notes, categorizedBy } = input;

      const updateData: any = {
        migrationCategory: category,
        categorizedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) updateData.migrationNotes = notes;
      if (categorizedBy) updateData.categorizedBy = categorizedBy;

      const result = await db
        .update(resources)
        .set(updateData)
        .where(eq(resources.resourceId, resourceId));

      // Get updated resource
      const updatedResource = await db
        .select({
          resourceId: resources.resourceId,
          resourceName: resources.resourceName,
          resourceType: resources.resourceType,
          migrationCategory: resources.migrationCategory,
          migrationNotes: resources.migrationNotes,
          categorizedAt: resources.categorizedAt,
          categorizedBy: resources.categorizedBy,
        })
        .from(resources)
        .where(eq(resources.resourceId, resourceId))
        .limit(1);

      if (updatedResource.length === 0) {
        throw new Error("Resource not found");
      }

      return {
        message: "Resource categorized successfully",
        resource: updatedResource[0],
      };
    }),

  // Bulk categorize resources
  bulkCategorize: publicProcedure
    .input(
      z.object({
        resourceIds: z.array(z.string()).min(1),
        category: z.enum(MIGRATION_CATEGORY_VALUES as [string, ...string[]]),
        notes: z.string().optional(),
        categorizedBy: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { resourceIds, category, notes, categorizedBy } = input;

      const updateData: any = {
        migrationCategory: category,
        categorizedAt: new Date(),
        updatedAt: new Date(),
      };

      if (notes) updateData.migrationNotes = notes;
      if (categorizedBy) updateData.categorizedBy = categorizedBy;

      await db
        .update(resources)
        .set(updateData)
        .where(inArray(resources.resourceId, resourceIds));

      // Count updated resources
      const updatedCount = await db
        .select({ count: count() })
        .from(resources)
        .where(
          and(
            inArray(resources.resourceId, resourceIds),
            eq(resources.migrationCategory, category),
          ),
        );

      return {
        message: "Resources categorized successfully",
        updated: updatedCount[0]?.count ?? 0,
        matched: resourceIds.length,
      };
    }),

  // Delete a resource
  delete: publicProcedure
    .input(z.object({ resourceId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db
        .delete(resources)
        .where(eq(resources.resourceId, input.resourceId));

      return { message: "Resource deleted successfully" };
    }),

  // Delete all resources (cleanup)
  cleanup: publicProcedure.mutation(async () => {
    // Get count before deletion
    const countResult = await db.select({ count: count() }).from(resources);
    const deletedCount = countResult[0]?.count ?? 0;

    // Delete all resources
    await db.delete(resources);

    return {
      message: "All resources deleted successfully",
      deletedCount,
    };
  }),

  // Export all resources and mappings
  exportAll: publicProcedure.query(async () => {
    // Get all resources
    const allResources = await db.select().from(resources);

    // Get all mappings with their targets
    const allMappings = await db.select().from(migrationMappings);
    const mappingsWithTargets = await Promise.all(
      allMappings.map(async (mapping) => {
        const targets = await db
          .select()
          .from(migrationMappingTargets)
          .where(eq(migrationMappingTargets.mappingId, mapping.id));
        return {
          ...mapping,
          targetResources: targets,
        };
      }),
    );

    return {
      resources: allResources,
      mappings: mappingsWithTargets,
      exportedAt: new Date().toISOString(),
      totalResources: allResources.length,
      totalMappings: mappingsWithTargets.length,
    };
  }),
});
