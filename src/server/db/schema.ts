import { relations, sql } from "drizzle-orm";
import { index, primaryKey, pgTableCreator } from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator(
	(name) => `aws-resources_${name}`,
);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.serial().primaryKey(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp()
			.default(sql`NOW()`)
			.notNull(),
		updatedAt: d.timestamp().$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const users = createTable("user", (d) => ({
	id: d
		.varchar({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.varchar({ length: 255 }),
	email: d.varchar({ length: 255 }).notNull(),
	emailVerified: d.timestamp().default(sql`NOW()`),
	image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
}));

export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.varchar({ length: 255 }).notNull(),
		providerAccountId: d.varchar({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.varchar({ length: 255 }),
		scope: d.varchar({ length: 255 }),
		id_token: d.text(),
		session_state: d.varchar({ length: 255 }),
	}),
	(t) => [
		primaryKey({
			columns: [t.provider, t.providerAccountId],
		}),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.timestamp().notNull(),
	}),
	(t) => [index("session_userId_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.varchar({ length: 255 }).notNull(),
		token: d.varchar({ length: 255 }).notNull(),
		expires: d.timestamp().notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// AWS Resources Schema
export const resources = createTable(
	"resource",
	(d) => ({
		id: d.serial().primaryKey(),
		resourceId: d.varchar({ length: 255 }).notNull().unique(),
		resourceArn: d.varchar({ length: 512 }),
		resourceType: d.varchar({ length: 100 }).notNull(),
		resourceName: d.varchar({ length: 255 }),
		awsAccountId: d.varchar({ length: 12 }),
		region: d.varchar({ length: 50 }).notNull(),
		availabilityZone: d.varchar({ length: 50 }),
		status: d.varchar({ length: 50 }),
		state: d.jsonb(),
		properties: d.jsonb(),
		configuration: d.jsonb(),
		security: d.jsonb(),

		// Metrics
		cpuAverage: d.real(),
		cpuPeak: d.real(),
		cpuUnit: d.varchar({ length: 20 }),
		memoryAverage: d.real(),
		memoryPeak: d.real(),
		memoryUnit: d.varchar({ length: 20 }),
		storageUsed: d.real(),
		storageAllocated: d.real(),
		storageUnit: d.varchar({ length: 20 }),
		networkInbound: d.real(),
		networkOutbound: d.real(),
		networkUnit: d.varchar({ length: 20 }),

		// Cost
		costEstimated: d.real(),
		costActual: d.real(),
		costCurrency: d.varchar({ length: 3 }).default("USD"),
		costBillingPeriod: d.varchar({ length: 50 }),
		costLastUpdated: d.timestamp(),

		// CloudFormation
		cfStackId: d.varchar({ length: 255 }),
		cfStackName: d.varchar({ length: 255 }),
		cfLogicalId: d.varchar({ length: 255 }),

		// Migration
		migrationCategory: d.varchar({ length: 20 }).default("uncategorized"),
		migrationNotes: d.text(),
		categorizedAt: d.timestamp(),
		categorizedBy: d.varchar({ length: 255 }),

		// Metadata
		collectedAt: d.timestamp().default(sql`NOW()`),
		collectorVersion: d.varchar({ length: 50 }),
		lastSyncedAt: d.timestamp(),
		syncStatus: d.varchar({ length: 20 }).default("pending"),
		errors: d.jsonb(),
		warnings: d.jsonb(),

		resourceCreatedAt: d.timestamp(),
		resourceModifiedAt: d.timestamp(),
		resourceTerminatedAt: d.timestamp(),
		createdAt: d
			.timestamp()
			.default(sql`NOW()`)
			.notNull(),
		updatedAt: d.timestamp().$onUpdate(() => new Date()),
	}),
	(t) => [
		index("resource_id_idx").on(t.resourceId),
		index("resource_type_idx").on(t.resourceType),
		index("region_idx").on(t.region),
		index("status_idx").on(t.status),
		index("migration_category_idx").on(t.migrationCategory),
		index("resource_type_region_idx").on(t.resourceType, t.region),
		index("collected_at_idx").on(t.collectedAt),
		index("cf_stack_name_idx").on(t.cfStackName),
	],
);

export const resourceTags = createTable(
	"resource_tag",
	(d) => ({
		id: d.serial().primaryKey(),
		resourceId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => resources.resourceId, { onDelete: "cascade" }),
		key: d.varchar({ length: 255 }).notNull(),
		value: d.varchar({ length: 1000 }),
	}),
	(t) => [
		index("tag_resource_id_idx").on(t.resourceId),
		index("tag_key_idx").on(t.key),
		index("tag_key_value_idx").on(t.key, t.value),
	],
);

export const resourceRelationships = createTable(
	"resource_relationship",
	(d) => ({
		id: d.serial().primaryKey(),
		sourceResourceId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => resources.resourceId, { onDelete: "cascade" }),
		targetResourceId: d.varchar({ length: 255 }).notNull(),
		targetResourceArn: d.varchar({ length: 512 }),
		targetResourceType: d.varchar({ length: 100 }),
		relationshipType: d.varchar({ length: 20 }).notNull(), // parent, child, reference, dependency
		metadata: d.jsonb(),
	}),
	(t) => [
		index("rel_source_resource_id_idx").on(t.sourceResourceId),
		index("rel_target_resource_id_idx").on(t.targetResourceId),
		index("rel_relationship_type_idx").on(t.relationshipType),
	],
);

export const resourceSnapshots = createTable(
	"resource_snapshot",
	(d) => ({
		id: d.serial().primaryKey(),
		snapshotId: d.varchar({ length: 255 }).notNull().unique(),
		profile: d.varchar({ length: 100 }).notNull(),
		region: d.varchar({ length: 50 }).notNull(),
		timestamp: d
			.timestamp()
			.default(sql`NOW()`)
			.notNull(),

		// Summary
		totalResources: d.integer(),
		resourcesByType: d.jsonb(),
		totalCostEstimated: d.real(),
		totalCostActual: d.real(),
		publicResources: d.integer(),
		orphanedResources: d.integer(),
		taggedResources: d.integer(),
		untaggedResources: d.integer(),

		// Relationships summary
		totalRelationships: d.integer(),
		parentChildPairs: d.integer(),
		references: d.integer(),
		dependencies: d.integer(),

		// Compliance
		complianceIssues: d.jsonb(),
		complianceScore: d.real(),

		// Changes
		changesAdded: d.jsonb(),
		changesModified: d.jsonb(),
		changesDeleted: d.jsonb(),

		// Metadata
		collectionDuration: d.integer(), // in milliseconds
		errors: d.jsonb(),
		warnings: d.jsonb(),
		version: d.varchar({ length: 50 }),

		createdAt: d
			.timestamp()
			.default(sql`NOW()`)
			.notNull(),
		updatedAt: d.timestamp().$onUpdate(() => new Date()),
	}),
	(t) => [
		index("snapshot_id_idx").on(t.snapshotId),
		index("snapshot_profile_idx").on(t.profile),
		index("snapshot_region_idx").on(t.region),
		index("snapshot_timestamp_idx").on(t.timestamp),
		index("snapshot_profile_region_timestamp_idx").on(
			t.profile,
			t.region,
			t.timestamp,
		),
	],
);

export const snapshotResources = createTable(
	"snapshot_resource",
	(d) => ({
		id: d.serial().primaryKey(),
		snapshotId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => resourceSnapshots.snapshotId, { onDelete: "cascade" }),
		resourceId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => resources.resourceId, { onDelete: "cascade" }),
	}),
	(t) => [
		index("sr_snapshot_id_idx").on(t.snapshotId),
		index("sr_resource_id_idx").on(t.resourceId),
		index("unique_snapshot_resource_idx").on(t.snapshotId, t.resourceId),
	],
);

export const migrationMappings = createTable(
	"migration_mapping",
	(d) => ({
		id: d.serial().primaryKey(),
		mappingGroupId: d.varchar({ length: 255 }).notNull().unique(),

		// Mapping metadata (no specific source/target info)
		mappingName: d.varchar({ length: 255 }),
		mappingDescription: d.text(),

		// Mapping direction and type
		mappingDirection: d.varchar({ length: 20 }).default("old_to_new"),

		// Migration status
		migrationStatus: d.varchar({ length: 20 }).default("not_started").notNull(),

		// Migration metadata
		plannedDate: d.timestamp(),
		migratedDate: d.timestamp(),
		verifiedDate: d.timestamp(),
		migratedBy: d.varchar({ length: 255 }),
		verifiedBy: d.varchar({ length: 255 }),
		rollbackDate: d.timestamp(),
		rollbackReason: d.text(),
		notes: d.text(),
		jiraTicket: d.varchar({ length: 255 }),
		pullRequestUrl: d.varchar({ length: 512 }),

		// Categorization
		category: d.varchar({ length: 30 }).default("undecided"),

		// Risk and priority
		priority: d.varchar({ length: 20 }).default("medium"),
		riskLevel: d.varchar({ length: 20 }).default("medium"),

		// Validation
		preChecks: d.jsonb(),
		postChecks: d.jsonb(),
		comparisonResults: d.jsonb(),

		// Audit trail
		history: d.jsonb(),

		createdAt: d
			.timestamp()
			.default(sql`NOW()`)
			.notNull(),
		updatedAt: d.timestamp().$onUpdate(() => new Date()),
	}),
	(t) => [
		index("mapping_group_id_idx").on(t.mappingGroupId),
		index("mapping_direction_idx").on(t.mappingDirection),
		index("mapping_migration_status_idx").on(t.migrationStatus),
		index("mapping_category_idx").on(t.category),
		index("mapping_priority_idx").on(t.priority),
		index("mapping_risk_level_idx").on(t.riskLevel),
	],
);

export const migrationMappingTargets = createTable(
	"migration_mapping_target",
	(d) => ({
		id: d.serial().primaryKey(),
		mappingId: d
			.integer()
			.notNull()
			.references(() => migrationMappings.id, { onDelete: "cascade" }),
		resourceId: d.varchar({ length: 255 }).notNull(),
		resourceType: d.varchar({ length: 100 }),
		resourceName: d.varchar({ length: 255 }),
		resourceArn: d.varchar({ length: 512 }),
		region: d.varchar({ length: 50 }),
		awsAccountId: d.varchar({ length: 12 }),
		category: d.varchar({ length: 20 }).notNull(),

		// Terraform metadata
		terraformType: d.varchar({ length: 100 }),
		terraformModule: d.varchar({ length: 255 }),
		terraformWorkspace: d.varchar({ length: 255 }),
		stateFile: d.varchar({ length: 512 }),

		// Mapping metadata
		mappingRatio: d.real().default(1.0),
		mappingType: d.varchar({ length: 20 }).default("replacement"),
		notes: d.text(),
	}),
	(t) => [
		index("mapping_target_mapping_id_idx").on(t.mappingId),
		index("mapping_target_resource_id_idx").on(t.resourceId),
		index("mapping_target_category_idx").on(t.category),
	],
);

export const migrationMappingSources = createTable(
	"migration_mapping_source",
	(d) => ({
		id: d.serial().primaryKey(),
		mappingId: d
			.integer()
			.notNull()
			.references(() => migrationMappings.id, { onDelete: "cascade" }),
		resourceId: d.varchar({ length: 255 }).notNull(),
		resourceType: d.varchar({ length: 100 }),
		resourceName: d.varchar({ length: 255 }),
		resourceArn: d.varchar({ length: 512 }),
		region: d.varchar({ length: 50 }),
		awsAccountId: d.varchar({ length: 12 }),
		category: d.varchar({ length: 20 }).notNull(),

		// Terraform metadata for source
		terraformType: d.varchar({ length: 100 }),
		terraformModule: d.varchar({ length: 255 }),
		terraformWorkspace: d.varchar({ length: 255 }),
		stateFile: d.varchar({ length: 512 }),

		// Source-specific metadata
		migrationReadiness: d.varchar({ length: 20 }).default("pending"), // 'ready', 'blocked', 'pending'
		deprecationDate: d.timestamp(),
		lastUsedDate: d.timestamp(),
		businessCriticality: d.varchar({ length: 20 }).default("medium"), // 'low', 'medium', 'high', 'critical'
		notes: d.text(),

		// Timestamps
		createdAt: d.timestamp().default(sql`NOW()`).notNull(),
		updatedAt: d.timestamp().$onUpdate(() => new Date()),
	}),
	(t) => [
		index("mapping_source_mapping_id_idx").on(t.mappingId),
		index("mapping_source_resource_id_idx").on(t.resourceId),
		index("mapping_source_resource_type_idx").on(t.resourceType),
		index("mapping_source_category_idx").on(t.category),
		index("mapping_source_migration_readiness_idx").on(t.migrationReadiness),
	],
);

export const migrationMappingDependencies = createTable(
	"migration_mapping_dependency",
	(d) => ({
		id: d.serial().primaryKey(),
		mappingId: d
			.integer()
			.notNull()
			.references(() => migrationMappings.id, { onDelete: "cascade" }),
		resourceId: d.varchar({ length: 255 }).notNull(),
		resourceType: d.varchar({ length: 100 }),
		dependencyType: d.varchar({ length: 20 }), // 'blocks', 'blocked_by', 'related'
		notes: d.text(),
	}),
	(t) => [
		index("mapping_dep_mapping_id_idx").on(t.mappingId),
		index("mapping_dep_resource_id_idx").on(t.resourceId),
		index("mapping_dep_dependency_type_idx").on(t.dependencyType),
	],
);

export const migrationMappingTags = createTable(
	"migration_mapping_tag",
	(d) => ({
		id: d.serial().primaryKey(),
		mappingId: d
			.integer()
			.notNull()
			.references(() => migrationMappings.id, { onDelete: "cascade" }),
		key: d.varchar({ length: 255 }).notNull(),
		value: d.varchar({ length: 1000 }),
	}),
	(t) => [
		index("mapping_tag_mapping_id_idx").on(t.mappingId),
		index("mapping_tag_key_idx").on(t.key),
		index("mapping_tag_key_value_idx").on(t.key, t.value),
	],
);

// Relations
export const resourcesRelations = relations(resources, ({ many }) => ({
	tags: many(resourceTags),
	relationships: many(resourceRelationships),
}));

export const resourceTagsRelations = relations(resourceTags, ({ one }) => ({
	resource: one(resources, {
		fields: [resourceTags.resourceId],
		references: [resources.resourceId],
	}),
}));

export const resourceRelationshipsRelations = relations(
	resourceRelationships,
	({ one }) => ({
		resource: one(resources, {
			fields: [resourceRelationships.sourceResourceId],
			references: [resources.resourceId],
		}),
	}),
);

export const resourceSnapshotsRelations = relations(
	resourceSnapshots,
	({ many }) => ({
		resources: many(snapshotResources),
	}),
);

export const snapshotResourcesRelations = relations(
	snapshotResources,
	({ one }) => ({
		snapshot: one(resourceSnapshots, {
			fields: [snapshotResources.snapshotId],
			references: [resourceSnapshots.snapshotId],
		}),
		resource: one(resources, {
			fields: [snapshotResources.resourceId],
			references: [resources.resourceId],
		}),
	}),
);

export const migrationMappingsRelations = relations(
	migrationMappings,
	({ many }) => ({
		sources: many(migrationMappingSources),
		targets: many(migrationMappingTargets),
		dependencies: many(migrationMappingDependencies),
		tags: many(migrationMappingTags),
	}),
);

export const migrationMappingSourcesRelations = relations(
	migrationMappingSources,
	({ one }) => ({
		mapping: one(migrationMappings, {
			fields: [migrationMappingSources.mappingId],
			references: [migrationMappings.id],
		}),
	}),
);

export const migrationMappingTargetsRelations = relations(
	migrationMappingTargets,
	({ one }) => ({
		mapping: one(migrationMappings, {
			fields: [migrationMappingTargets.mappingId],
			references: [migrationMappings.id],
		}),
	}),
);

export const migrationMappingDependenciesRelations = relations(
	migrationMappingDependencies,
	({ one }) => ({
		mapping: one(migrationMappings, {
			fields: [migrationMappingDependencies.mappingId],
			references: [migrationMappings.id],
		}),
	}),
);

export const migrationMappingTagsRelations = relations(
	migrationMappingTags,
	({ one }) => ({
		mapping: one(migrationMappings, {
			fields: [migrationMappingTags.mappingId],
			references: [migrationMappings.id],
		}),
	}),
);
