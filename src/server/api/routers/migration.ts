import {
  MAPPING_DIRECTION_VALUES,
  MIGRATION_MAPPING_CATEGORY_VALUES,
  MIGRATION_PRIORITY_VALUES,
  MIGRATION_STATUS_VALUES,
} from "@/constants/migration";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import {
  migrationMappingDependencies,
  migrationMappingSources,
  migrationMappingTags,
  migrationMappingTargets,
  migrationMappings,
  resources,
} from "@/server/db/schema";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  lt,
  notInArray,
  or,
} from "drizzle-orm";
import { z } from "zod";

const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(250).default(50),
});

export const migrationRouter = createTRPCRouter({
  // Get all migration mappings with filters
  mappings: publicProcedure
    .input(
      z
        .object({
          status: z
            .enum(MIGRATION_STATUS_VALUES as [string, ...string[]])
            .optional(),
          category: z
            .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
            .optional(),
          priority: z
            .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
            .optional(),
          resourceType: z.string().optional(),
          search: z.string().optional(),
        })
        .merge(paginationSchema),
    )
    .query(async ({ input }) => {
      const { page, limit, status, category, priority, resourceType, search } =
        input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (status)
        conditions.push(eq(migrationMappings.migrationStatus, status));
      if (category) conditions.push(eq(migrationMappings.category, category));
      if (priority) conditions.push(eq(migrationMappings.priority, priority));
      // Note: resourceType and search filtering will now need to be done after fetching
      // since these fields are now in the separate migrationMappingSources table

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [mappingsList, totalResult] = await Promise.all([
        db
          .select()
          .from(migrationMappings)
          .where(whereCondition)
          .limit(limit)
          .offset(offset)
          .orderBy(
            migrationMappings.priority,
            desc(migrationMappings.updatedAt),
          ),
        db
          .select({ count: count() })
          .from(migrationMappings)
          .where(whereCondition),
      ]);


      // Fetch source and target resources for each mapping
      const mappingsWithResources = await Promise.all(
        mappingsList.map(async (mapping) => {
          const [sources, targets] = await Promise.all([
            db
              .select()
              .from(migrationMappingSources)
              .where(eq(migrationMappingSources.mappingId, mapping.id)),
            db
              .select()
              .from(migrationMappingTargets)
              .where(eq(migrationMappingTargets.mappingId, mapping.id)),
          ]);

          return {
            ...mapping,
            sourceResources: sources,
            targetResources: targets,
          };
        }),
      );

      // Apply client-side filtering for fields now in separate tables
      let filteredMappings = mappingsWithResources;

      if (resourceType) {
        filteredMappings = filteredMappings.filter((mapping) =>
          mapping.sourceResources?.some(
            (source) => source.resourceType === resourceType,
          ),
        );
      }

      if (search) {
        filteredMappings = filteredMappings.filter(
          (mapping) =>
            mapping.sourceResources?.some(
              (source) =>
                source.resourceName
                  ?.toLowerCase()
                  .includes(search.toLowerCase()) ||
                source.resourceId?.toLowerCase().includes(search.toLowerCase()),
            ) ||
            mapping.mappingName?.toLowerCase().includes(search.toLowerCase()),
        );
      }

      return {
        mappings: filteredMappings,
        pagination: {
          page,
          limit,
          total: filteredMappings.length, // Update total to reflect filtered count
          pages: Math.ceil(filteredMappings.length / limit),
        },
      };
    }),

  // Infinite scroll version of mappings
  mappingsInfinite: publicProcedure
    .input(
      z.object({
        status: z
          .enum(MIGRATION_STATUS_VALUES as [string, ...string[]])
          .optional(),
        category: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .optional(),
        priority: z
          .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
          .optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(250).default(50),
      }),
    )
    .query(async ({ input }) => {
      const { status, category, priority, cursor, limit } = input;
      console.log("mappingsInfinite API called with:", {
        status,
        category,
        priority,
        cursor,
        limit,
      });

      // Build the query conditions
      const conditions = [];
      if (status) {
        conditions.push(eq(migrationMappings.migrationStatus, status));
      }
      if (category) {
        conditions.push(eq(migrationMappings.category, category));
      }
      if (priority) {
        conditions.push(eq(migrationMappings.priority, priority));
      }

      // Apply cursor pagination
      if (cursor) {
        const [createdAt, id] = cursor.split("_");
        console.log("Parsing cursor:", { cursor, createdAt, id });
        if (createdAt && id) {
          const parsedId = parseInt(id);
          const parsedDate = new Date(createdAt);
          console.log("Parsed cursor values:", {
            parsedId,
            parsedDate,
            isValidDate: !isNaN(parsedDate.getTime()),
          });

          if (!isNaN(parsedId) && !isNaN(parsedDate.getTime())) {
            conditions.push(
              or(
                lt(migrationMappings.createdAt, parsedDate),
                and(
                  eq(migrationMappings.createdAt, parsedDate),
                  lt(migrationMappings.id, parsedId),
                ),
              ),
            );
          } else {
            console.error("Invalid cursor values:", { parsedId, parsedDate });
          }
        }
      }

      // Build and execute the query
      const baseQuery = db
        .select()
        .from(migrationMappings)
        .orderBy(desc(migrationMappings.createdAt), desc(migrationMappings.id));

      let mappingsList;
      try {
        mappingsList =
          conditions.length > 0
            ? await baseQuery.where(and(...conditions)).limit(limit + 1)
            : await baseQuery.limit(limit + 1); // Fetch one extra to determine if there's a next page
        console.log(
          "Query executed successfully, got",
          mappingsList.length,
          "results",
        );
      } catch (error) {
        console.error("Database query error:", error);
        throw error;
      }

      // Determine if there's a next page
      const hasNextPage = mappingsList.length > limit;
      const mappings = hasNextPage ? mappingsList.slice(0, -1) : mappingsList;

      // Get source and target resources for each mapping
      const mappingsWithResources = await Promise.all(
        mappings.map(async (mapping) => {
          // Get source resources
          const sources = await db
            .select({
              resourceId: migrationMappingSources.resourceId,
              resourceName: migrationMappingSources.resourceName,
              resourceType: migrationMappingSources.resourceType,
            })
            .from(migrationMappingSources)
            .where(eq(migrationMappingSources.mappingId, mapping.id));

          // Get target resources
          const targets = await db
            .select({
              resourceId: migrationMappingTargets.resourceId,
              resourceName: migrationMappingTargets.resourceName,
              resourceType: migrationMappingTargets.resourceType,
            })
            .from(migrationMappingTargets)
            .where(eq(migrationMappingTargets.mappingId, mapping.id));

          return {
            ...mapping,
            sourceResources: sources,
            targetResources: targets,
          };
        }),
      );

      // Generate next cursor
      let nextCursor: string | undefined;
      if (hasNextPage) {
        const lastItem = mappings[mappings.length - 1];
        nextCursor = `${lastItem!.createdAt.toISOString()}_${lastItem!.id}`;
      }

      return {
        mappings: mappingsWithResources,
        nextCursor,
      };
    }),

  // Create bulk many-to-many mappings (multiple sources to multiple targets)
  createBulkManyToManyMapping: publicProcedure
    .input(
      z.object({
        sourceResourceIds: z.array(z.string()).default([]),
        targetResourceIds: z.array(z.string()).default([]),
        mappingDirection: z
          .enum(MAPPING_DIRECTION_VALUES as [string, ...string[]])
          .default("old_to_new"),
        mappingType: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .default("replacement"),
        notes: z.string().optional(),
        priority: z
          .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
          .default("medium"),
      }),
    )
    .mutation(async ({ input }) => {
      const {
        sourceResourceIds,
        targetResourceIds,
        mappingDirection,
        mappingType,
        notes,
        priority,
      } = input;

      // Validate that at least one of the arrays has elements
      if (sourceResourceIds.length === 0 && targetResourceIds.length === 0) {
        throw new Error(
          "At least one of sourceResourceIds or targetResourceIds must be provided",
        );
      }

      // Get source resource details (skip if no sources for "Map from Nothing")
      let sourceResources: any[] = [];
      if (sourceResourceIds.length > 0) {
        sourceResources = await db
          .select()
          .from(resources)
          .where(inArray(resources.resourceId, sourceResourceIds));

        if (sourceResources.length !== sourceResourceIds.length) {
          throw new Error("One or more source resources not found");
        }
      }

      // Get target resource details (skip if no targets for "Map to Nothing")
      let targetResources: any[] = [];
      if (targetResourceIds.length > 0) {
        targetResources = await db
          .select()
          .from(resources)
          .where(inArray(resources.resourceId, targetResourceIds));

        if (targetResources.length !== targetResourceIds.length) {
          throw new Error("One or more target resources not found");
        }
      }

      // Use a single transaction for all mappings
      const results = await db.transaction(async (tx) => {
        // Generate a single mappingGroupId for the entire many-to-many operation
        const sharedMappingGroupId = `many-to-many-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create single migration mapping record (group-centric)
        const mappingResult = await tx
          .insert(migrationMappings)
          .values({
            mappingGroupId: sharedMappingGroupId,
            mappingName: `Many-to-Many: ${sourceResourceIds.length} sources → ${targetResourceIds.length} targets`,
            mappingDescription:
              notes ||
              `Many-to-many mapping created with ${sourceResourceIds.length} source resources and ${targetResourceIds.length} target resources`,
            mappingDirection,
            priority,
            category: mappingType,
            notes,
            history: JSON.stringify([
              {
                action: "created",
                timestamp: new Date(),
                user: "system",
                details:
                  targetResourceIds.length === 0
                    ? `Many-to-many mapping to nothing (${mappingType})`
                    : `Many-to-many mapping: ${sourceResourceIds.length} sources → ${targetResourceIds.length} targets`,
              },
            ]),
          })
          .returning({ id: migrationMappings.id });

        const mappingId = mappingResult[0]?.id;
        if (!mappingId) {
          throw new Error("Failed to create mapping group");
        }

        // Create source mappings (only if there are sources)
        if (sourceResources.length > 0) {
          const sourceMappingsData = sourceResources.map((resource) => ({
            mappingId,
            resourceId: resource.resourceId,
            resourceType: resource.resourceType,
            resourceName: resource.resourceName,
            resourceArn: resource.resourceArn,
            region: resource.region,
            awsAccountId: resource.awsAccountId,
            category: resource.migrationCategory || "uncategorized",
            notes: `Source resource in many-to-many mapping`,
          }));

          await tx.insert(migrationMappingSources).values(sourceMappingsData);
        }

        // Create target mappings (only if there are targets)
        if (targetResources.length > 0) {
          const targetMappingsData = targetResources.map((resource) => ({
            mappingId,
            resourceId: resource.resourceId,
            resourceType: resource.resourceType,
            resourceName: resource.resourceName,
            resourceArn: resource.resourceArn,
            region: resource.region,
            awsAccountId: resource.awsAccountId,
            category: resource.migrationCategory || "uncategorized",
            mappingType,
            notes: `Target resource in many-to-many mapping`,
          }));

          await tx.insert(migrationMappingTargets).values(targetMappingsData);
        }

        return {
          mappingId,
          mappingGroupId: sharedMappingGroupId,
          sourceCount: sourceResourceIds.length,
          targetCount: targetResourceIds.length,
        };
      });

      return {
        message: "Many-to-many mapping created successfully",
        mappingId: results.mappingId,
        mappingGroupId: results.mappingGroupId,
        sourceCount: results.sourceCount,
        targetCount: results.targetCount,
      };
    }),

  // Get mappings by group ID (for many-to-many relationships)
  getMappingsByGroupId: publicProcedure
    .input(z.object({ mappingGroupId: z.string() }))
    .query(async ({ input }) => {
      const { mappingGroupId } = input;

      // Get the main mapping record
      const mappingRecord = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.mappingGroupId, mappingGroupId))
        .limit(1);

      if (mappingRecord.length === 0) {
        throw new Error("Mapping not found");
      }

      const mapping = mappingRecord[0]!;

      // Get source resources
      const sources = await db
        .select({
          resourceId: migrationMappingSources.resourceId,
          resourceName: migrationMappingSources.resourceName,
          resourceType: migrationMappingSources.resourceType,
          region: migrationMappingSources.region,
          category: migrationMappingSources.category,
        })
        .from(migrationMappingSources)
        .where(eq(migrationMappingSources.mappingId, mapping.id));

      // Get target resources
      const targets = await db
        .select({
          resourceId: migrationMappingTargets.resourceId,
          resourceName: migrationMappingTargets.resourceName,
          resourceType: migrationMappingTargets.resourceType,
          region: migrationMappingTargets.region,
          category: migrationMappingTargets.category,
          mappingType: migrationMappingTargets.mappingType,
        })
        .from(migrationMappingTargets)
        .where(eq(migrationMappingTargets.mappingId, mapping.id));

      return {
        mappingGroupId,
        mapping: {
          ...mapping,
          sourceResources: sources,
          targetResources: targets,
        },
        sourceCount: sources.length,
        targetCount: targets.length,
        isManyToMany: sources.length > 1 && targets.length > 1,
      };
    }),

  // Create a new migration mapping
  createMapping: publicProcedure
    .input(
      z.object({
        sourceResourceId: z.string(),
        targetResourceIds: z.array(z.string()).default([]),
        mappingDirection: z
          .enum(MAPPING_DIRECTION_VALUES as [string, ...string[]])
          .default("old_to_new"),
        mappingType: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .default("replacement"),
        notes: z.string().optional(),
        priority: z
          .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
          .default("medium"),
      }),
    )
    .mutation(async ({ input }) => {
      const {
        sourceResourceId,
        targetResourceIds,
        mappingDirection,
        mappingType,
        notes,
        priority,
      } = input;

      // Get source resource details
      const sourceResourceResult = await db
        .select()
        .from(resources)
        .where(eq(resources.resourceId, sourceResourceId))
        .limit(1);

      if (sourceResourceResult.length === 0) {
        throw new Error("Source resource not found");
      }

      const sourceResource = sourceResourceResult[0]!;

      // Get target resource details (skip if no targets for "Map to Nothing")
      let targetResources: any[] = [];
      if (targetResourceIds.length > 0) {
        targetResources = await db
          .select()
          .from(resources)
          .where(inArray(resources.resourceId, targetResourceIds));

        if (targetResources.length !== targetResourceIds.length) {
          throw new Error("One or more target resources not found");
        }
      }

      // Generate mapping group ID
      const mappingGroupId = `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create migration mapping
      const mappingResult = await db
        .insert(migrationMappings)
        .values({
          mappingGroupId,
          mappingDirection,
          priority,
          category: mappingType,
          notes,
          history: JSON.stringify([
            {
              action: "created",
              timestamp: new Date(),
              user: "system",
              details:
                targetResourceIds.length === 0
                  ? `Mapped resource to nothing (${mappingType})`
                  : `Created many-to-many mapping: 1 source -> ${targetResourceIds.length} targets`,
            },
          ]),
        })
        .returning({ id: migrationMappings.id });

      const mappingId = mappingResult[0]?.id;

      if (!mappingId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create mapping",
        });
      }

      // Create source resource mapping
      await db.insert(migrationMappingSources).values({
        mappingId,
        resourceId: sourceResource.resourceId,
        resourceType: sourceResource.resourceType,
        resourceName: sourceResource.resourceName,
        resourceArn: sourceResource.resourceArn,
        region: sourceResource.region,
        awsAccountId: sourceResource.awsAccountId,
        category: sourceResource.migrationCategory || "uncategorized",
      });

      // Create target mappings (only if there are targets)
      if (targetResources.length > 0) {
        const targetMappingsData = targetResources.map((resource) => ({
          mappingId,
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          resourceName: resource.resourceName,
          resourceArn: resource.resourceArn,
          region: resource.region,
          awsAccountId: resource.awsAccountId,
          category: resource.migrationCategory || "uncategorized",
          mappingType,
          notes,
        }));

        await db.insert(migrationMappingTargets).values(targetMappingsData);
      }

      return {
        message: "Mapping created successfully",
        mappingId,
        mappingGroupId,
      };
    }),

  // Create a mapping for newly added resources (Map from Nothing)
  createNewResourceMapping: publicProcedure
    .input(
      z.object({
        targetResourceIds: z.array(z.string()).min(1),
        mappingType: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .default("addition"),
        notes: z.string().optional(),
        priority: z
          .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
          .default("medium"),
        category: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .default("undecided"),
      }),
    )
    .mutation(async ({ input }) => {
      const { targetResourceIds, mappingType, notes, priority, category } =
        input;

      // Get target resource details
      const targetResources = await db
        .select()
        .from(resources)
        .where(inArray(resources.resourceId, targetResourceIds));

      if (targetResources.length !== targetResourceIds.length) {
        throw new Error("One or more target resources not found");
      }

      // Generate mapping group ID
      const mappingGroupId = `new-mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create migration mapping with null source (newly added)
      const mappingResult = await db
        .insert(migrationMappings)
        .values({
          mappingGroupId,
          mappingDirection: "new_to_new",
          priority,
          category,
          notes,
          history: JSON.stringify([
            {
              action: "created",
              timestamp: new Date(),
              user: "system",
              details: `Marked ${targetResourceIds.length} resources as newly added`,
            },
          ]),
        })
        .returning({ id: migrationMappings.id });

      const mappingId = mappingResult[0]?.id;

      if (!mappingId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create new resource mapping",
        });
      }

      // Create special source resource mapping for newly added resources
      await db.insert(migrationMappingSources).values({
        mappingId,
        resourceId: "NEW_RESOURCE", // Special identifier for newly added
        resourceType: "NEW",
        resourceName: "Newly Added Resource",
        resourceArn: null,
        region: targetResources[0]?.region || "unknown",
        awsAccountId: targetResources[0]?.awsAccountId || "unknown",
        category: "new",
      });

      // Create target mappings
      const targetMappingsData = targetResources.map((resource) => ({
        mappingId,
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        resourceName: resource.resourceName,
        resourceArn: resource.resourceArn,
        region: resource.region,
        awsAccountId: resource.awsAccountId,
        category: resource.migrationCategory || "uncategorized",
        mappingType,
        notes,
      }));

      await db.insert(migrationMappingTargets).values(targetMappingsData);

      return {
        message: "New resource mapping created successfully",
        mappingId,
        mappingGroupId,
      };
    }),

  // Delete a migration mapping
  deleteMapping: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id } = input;

      // Check if mapping exists
      const existingMapping = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.id, id))
        .limit(1);

      if (existingMapping.length === 0) {
        throw new Error("Mapping not found");
      }

      // Delete related target mappings first (foreign key constraint)
      await db
        .delete(migrationMappingTargets)
        .where(eq(migrationMappingTargets.mappingId, id));

      // Delete any dependencies
      await db
        .delete(migrationMappingDependencies)
        .where(eq(migrationMappingDependencies.mappingId, id));

      // Delete any tags
      await db
        .delete(migrationMappingTags)
        .where(eq(migrationMappingTags.mappingId, id));

      // Finally delete the mapping itself
      await db.delete(migrationMappings).where(eq(migrationMappings.id, id));

      return {
        message: "Mapping deleted successfully",
        id,
      };
    }),

  // Add targets to existing mapping
  addTargets: publicProcedure
    .input(
      z.object({
        mappingGroupId: z.string(),
        targetResourceIds: z.array(z.string()).min(1),
        mappingType: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .default("replacement"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { mappingGroupId, targetResourceIds, mappingType, notes } = input;

      // Find the mapping
      const mappingResult = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.mappingGroupId, mappingGroupId))
        .limit(1);

      if (mappingResult.length === 0) {
        throw new Error("Mapping not found");
      }

      const mapping = mappingResult[0]!;

      // Get target resource details
      const targetResources = await db
        .select()
        .from(resources)
        .where(inArray(resources.resourceId, targetResourceIds));

      if (targetResources.length !== targetResourceIds.length) {
        throw new Error("One or more target resources not found");
      }

      // Add new targets
      const newTargetsData = targetResources.map((resource) => ({
        mappingId: mapping.id,
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        resourceName: resource.resourceName,
        resourceArn: resource.resourceArn,
        region: resource.region,
        awsAccountId: resource.awsAccountId,
        category: resource.migrationCategory || "uncategorized",
        mappingType,
        notes,
      }));

      await db.insert(migrationMappingTargets).values(newTargetsData);

      // Update history
      const currentHistory = mapping.history
        ? JSON.parse(mapping.history as string)
        : [];
      currentHistory.push({
        action: "targets_added",
        timestamp: new Date(),
        user: "system",
        details: `Added ${targetResourceIds.length} target resources`,
      });

      await db
        .update(migrationMappings)
        .set({
          history: JSON.stringify(currentHistory),
          updatedAt: new Date(),
        })
        .where(eq(migrationMappings.id, mapping.id));

      return {
        message: "Targets added successfully",
      };
    }),

  // Remove targets from existing mapping
  removeTargets: publicProcedure
    .input(
      z.object({
        mappingGroupId: z.string(),
        targetResourceIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const { mappingGroupId, targetResourceIds } = input;

      // Find the mapping
      const mappingResult = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.mappingGroupId, mappingGroupId))
        .limit(1);

      if (mappingResult.length === 0) {
        throw new Error("Mapping not found");
      }

      const mapping = mappingResult[0]!;

      // Remove targets
      await db
        .delete(migrationMappingTargets)
        .where(
          and(
            eq(migrationMappingTargets.mappingId, mapping.id),
            inArray(migrationMappingTargets.resourceId, targetResourceIds),
          ),
        );

      // Update history
      const currentHistory = mapping.history
        ? JSON.parse(mapping.history as string)
        : [];
      currentHistory.push({
        action: "targets_removed",
        timestamp: new Date(),
        user: "system",
        details: `Removed ${targetResourceIds.length} target resources`,
      });

      await db
        .update(migrationMappings)
        .set({
          history: JSON.stringify(currentHistory),
          updatedAt: new Date(),
        })
        .where(eq(migrationMappings.id, mapping.id));

      return {
        message: "Targets removed successfully",
      };
    }),

  // Bulk categorize resources
  bulkCategorize: publicProcedure
    .input(
      z.object({
        resourceIds: z.array(z.string()).min(1),
        category: z.enum(
          MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]],
        ),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { resourceIds, category, notes } = input;

      const results = [];

      for (const resourceId of resourceIds) {
        // Check if mapping already exists
        const existingSourceMapping = await db
          .select({ mappingId: migrationMappingSources.mappingId })
          .from(migrationMappingSources)
          .where(eq(migrationMappingSources.resourceId, resourceId))
          .limit(1);

        if (existingSourceMapping.length > 0) {
          const mappingId = existingSourceMapping[0]!.mappingId;
          const existingMapping = await db
            .select()
            .from(migrationMappings)
            .where(eq(migrationMappings.id, mappingId))
            .limit(1);

          if (existingMapping.length > 0 && existingMapping[0]) {
            const existing = existingMapping[0];
            // Update existing mapping
            await db
              .update(migrationMappings)
              .set({
                category,
                notes: notes || existing.notes,
                updatedAt: new Date(),
              })
              .where(eq(migrationMappings.id, existing.id));

            results.push(existing);
          }
        } else {
          // Create new mapping
          const resourceResult = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

          if (resourceResult.length > 0) {
            const mappingGroupId = `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const newMappingResult = await db
              .insert(migrationMappings)
              .values({
                mappingGroupId,
                category,
                notes,
                history: JSON.stringify([
                  {
                    action: "categorized",
                    timestamp: new Date(),
                    user: "system",
                    details: `Bulk categorized as ${category}`,
                  },
                ]),
              })
              .returning();

            results.push(newMappingResult[0]);
          }
        }
      }

      return {
        updated: results.length,
        mappings: results,
      };
    }),

  // Get migration statistics
  statistics: publicProcedure.query(async () => {
    const totalResourcesResult = await db
      .select({ count: count() })
      .from(resources);
    const totalResources = totalResourcesResult[0]?.count ?? 0;

    const mappedResourcesResult = await db
      .select({ count: count() })
      .from(migrationMappings);
    const mappedResources = mappedResourcesResult[0]?.count ?? 0;

    const unmappedResources = totalResources - mappedResources;

    // Get mappings by status
    const mappingsByStatus = await db
      .select({
        status: migrationMappings.migrationStatus,
        count: count(),
      })
      .from(migrationMappings)
      .groupBy(migrationMappings.migrationStatus);

    // Get mappings by category
    const mappingsByCategory = await db
      .select({
        category: migrationMappings.category,
        count: count(),
      })
      .from(migrationMappings)
      .groupBy(migrationMappings.category);

    // Get mappings by priority
    const mappingsByPriority = await db
      .select({
        priority: migrationMappings.priority,
        count: count(),
      })
      .from(migrationMappings)
      .groupBy(migrationMappings.priority);

    // Get recent migrations
    const recentMigrations = await db
      .select()
      .from(migrationMappings)
      .where(eq(migrationMappings.migrationStatus, "migrated"))
      .orderBy(desc(migrationMappings.migratedDate))
      .limit(10);

    // Get upcoming migrations
    const upcomingMigrations = await db
      .select()
      .from(migrationMappings)
      .where(
        and(
          eq(migrationMappings.migrationStatus, "not_started"),
          // TODO: Add condition for planned date exists
        ),
      )
      .orderBy(migrationMappings.plannedDate)
      .limit(10);

    const migratedCount =
      mappingsByStatus.find((s) => s.status === "migrated")?.count ?? 0;
    const migrationProgress =
      mappedResources > 0
        ? ((migratedCount / mappedResources) * 100).toFixed(1)
        : "0";

    return {
      overview: {
        totalResources,
        mappedResources,
        unmappedResources,
        migrationProgress,
      },
      byStatus: mappingsByStatus.map((s) => ({
        status: s.status,
        count: s.count,
      })),
      byCategory: mappingsByCategory.map((c) => ({
        category: c.category,
        count: c.count,
      })),
      byPriority: mappingsByPriority.map((p) => ({
        priority: p.priority,
        count: p.count,
      })),
      recentMigrations,
      upcomingMigrations,
    };
  }),

  // Get unmapped resources
  unmapped: publicProcedure.query(async () => {
    // Get all mapped resource IDs from the migrationMappingSources table
    const mappedResourceIds = await db
      .select({
        resourceId: migrationMappingSources.resourceId,
      })
      .from(migrationMappingSources);

    const mappedIds = mappedResourceIds
      .map((r) => r.resourceId)
      .filter((id) => id !== "NEW_RESOURCE"); // Exclude special placeholder

    // Find resources not in mapping
    const unmappedResourcesQuery =
      mappedIds.length > 0
        ? db
            .select({
              resourceId: resources.resourceId,
              resourceType: resources.resourceType,
              resourceName: resources.resourceName,
              region: resources.region,
              status: resources.status,
            })
            .from(resources)
            .where(notInArray(resources.resourceId, mappedIds))
            .orderBy(resources.resourceType, resources.resourceName)
        : db
            .select({
              resourceId: resources.resourceId,
              resourceType: resources.resourceType,
              resourceName: resources.resourceName,
              region: resources.region,
              status: resources.status,
            })
            .from(resources)
            .orderBy(resources.resourceType, resources.resourceName);

    const unmappedResources = await unmappedResourcesQuery;

    return {
      count: unmappedResources.length,
      resources: unmappedResources,
    };
  }),

  // Update mapping notes and other fields
  updateMapping: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
        notes: z.string().optional(),
        priority: z
          .enum(MIGRATION_PRIORITY_VALUES as [string, ...string[]])
          .optional(),
        category: z
          .enum(MIGRATION_MAPPING_CATEGORY_VALUES as [string, ...string[]])
          .optional(),
        migrationStatus: z
          .enum(MIGRATION_STATUS_VALUES as [string, ...string[]])
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, notes, priority, category, migrationStatus } = input;

      // Check if mapping exists
      const existingMapping = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.id, id))
        .limit(1);

      if (existingMapping.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mapping not found",
        });
      }

      const mapping = existingMapping[0]!;

      // Update the mapping
      const updateData: Partial<typeof migrationMappings.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (notes !== undefined) {
        updateData.notes = notes;
      }
      if (priority !== undefined) {
        updateData.priority = priority;
      }
      if (category !== undefined) {
        updateData.category = category;
      }
      if (migrationStatus !== undefined) {
        updateData.migrationStatus = migrationStatus;
      }

      // Update history
      let currentHistory: any[] = [];
      try {
        if (mapping.history) {
          if (typeof mapping.history === 'string') {
            currentHistory = JSON.parse(mapping.history);
          } else if (Array.isArray(mapping.history)) {
            currentHistory = mapping.history;
          }
        }
      } catch (error) {
        console.warn('Failed to parse mapping history, starting fresh:', error);
        currentHistory = [];
      }

      currentHistory.push({
        action: "updated",
        timestamp: new Date(),
        user: "system",
        details: `Updated mapping${notes !== undefined ? " with notes" : ""}${priority !== undefined ? ` priority to ${priority}` : ""}${category !== undefined ? ` category to ${category}` : ""}${migrationStatus !== undefined ? ` status to ${migrationStatus}` : ""}`,
      });
      updateData.history = JSON.stringify(currentHistory);

      await db
        .update(migrationMappings)
        .set(updateData)
        .where(eq(migrationMappings.id, id));

      return {
        message: "Mapping updated successfully",
        id,
      };
    }),

  // Validate migration mapping
  validate: publicProcedure
    .input(z.object({ mappingId: z.number() }))
    .mutation(async ({ input }) => {
      const mappingResult = await db
        .select()
        .from(migrationMappings)
        .where(eq(migrationMappings.id, input.mappingId))
        .limit(1);

      if (mappingResult.length === 0) {
        throw new Error("Mapping not found");
      }

      const mapping = mappingResult[0]!;

      // Get source resource
      const sourceResourceResult = await db
        .select()
        .from(migrationMappingSources)
        .where(eq(migrationMappingSources.mappingId, mapping.id))
        .limit(1);

      // Get target resources
      const targetResourcesResult = await db
        .select()
        .from(migrationMappingTargets)
        .where(eq(migrationMappingTargets.mappingId, mapping.id));

      const validationResults = {
        checks: [],
        identical: false,
        differences: [] as string[],
      };

      // Perform basic validation checks
      if (sourceResourceResult.length === 0) {
        validationResults.differences.push("Source resource not found");
      }

      if (targetResourcesResult.length === 0) {
        validationResults.differences.push("No target resources found");
      }

      validationResults.identical = validationResults.differences.length === 0;

      // Update mapping with validation results
      const comparisonResults = {
        identical: validationResults.identical,
        differences: validationResults.differences,
        comparedAt: new Date(),
      };

      await db
        .update(migrationMappings)
        .set({
          comparisonResults: JSON.stringify(comparisonResults),
          updatedAt: new Date(),
        })
        .where(eq(migrationMappings.id, mapping.id));

      return {
        mapping,
        validationResults,
      };
    }),
});
