CREATE TABLE "aws-resources_account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "aws-resources_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "aws-resources_migration_mapping_dependency" (
	"id" serial PRIMARY KEY NOT NULL,
	"mappingId" integer NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"resourceType" varchar(100),
	"dependencyType" varchar(20),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "aws-resources_migration_mapping_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"mappingId" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "aws-resources_migration_mapping_target" (
	"id" serial PRIMARY KEY NOT NULL,
	"mappingId" integer NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"resourceType" varchar(100),
	"resourceName" varchar(255),
	"resourceArn" varchar(512),
	"region" varchar(50),
	"awsAccountId" varchar(12),
	"category" varchar(20) NOT NULL,
	"terraformType" varchar(100),
	"terraformModule" varchar(255),
	"terraformWorkspace" varchar(255),
	"stateFile" varchar(512),
	"mappingRatio" real DEFAULT 1,
	"mappingType" varchar(20) DEFAULT 'replacement',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "aws-resources_migration_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"mappingGroupId" varchar(255) NOT NULL,
	"sourceResourceId" varchar(255) NOT NULL,
	"sourceResourceType" varchar(100),
	"sourceResourceName" varchar(255),
	"sourceResourceArn" varchar(512),
	"sourceRegion" varchar(50),
	"sourceAwsAccountId" varchar(12),
	"sourceCategory" varchar(20) NOT NULL,
	"mappingDirection" varchar(20) DEFAULT 'old_to_new',
	"migrationStatus" varchar(20) DEFAULT 'not_started' NOT NULL,
	"plannedDate" timestamp,
	"migratedDate" timestamp,
	"verifiedDate" timestamp,
	"migratedBy" varchar(255),
	"verifiedBy" varchar(255),
	"rollbackDate" timestamp,
	"rollbackReason" text,
	"notes" text,
	"jiraTicket" varchar(255),
	"pullRequestUrl" varchar(512),
	"category" varchar(30) DEFAULT 'undecided',
	"priority" varchar(20) DEFAULT 'medium',
	"riskLevel" varchar(20) DEFAULT 'medium',
	"preChecks" jsonb,
	"postChecks" jsonb,
	"comparisonResults" jsonb,
	"history" jsonb,
	"createdAt" timestamp DEFAULT NOW() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "aws-resources_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"createdById" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT NOW() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "aws-resources_resource_relationship" (
	"id" serial PRIMARY KEY NOT NULL,
	"sourceResourceId" varchar(255) NOT NULL,
	"targetResourceId" varchar(255) NOT NULL,
	"targetResourceArn" varchar(512),
	"targetResourceType" varchar(100),
	"relationshipType" varchar(20) NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "aws-resources_resource_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshotId" varchar(255) NOT NULL,
	"profile" varchar(100) NOT NULL,
	"region" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT NOW() NOT NULL,
	"totalResources" integer,
	"resourcesByType" jsonb,
	"totalCostEstimated" real,
	"totalCostActual" real,
	"publicResources" integer,
	"orphanedResources" integer,
	"taggedResources" integer,
	"untaggedResources" integer,
	"totalRelationships" integer,
	"parentChildPairs" integer,
	"references" integer,
	"dependencies" integer,
	"complianceIssues" jsonb,
	"complianceScore" real,
	"changesAdded" jsonb,
	"changesModified" jsonb,
	"changesDeleted" jsonb,
	"collectionDuration" integer,
	"errors" jsonb,
	"warnings" jsonb,
	"version" varchar(50),
	"createdAt" timestamp DEFAULT NOW() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "aws-resources_resource_snapshot_snapshotId_unique" UNIQUE("snapshotId")
);
--> statement-breakpoint
CREATE TABLE "aws-resources_resource_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "aws-resources_resource" (
	"id" serial PRIMARY KEY NOT NULL,
	"resourceId" varchar(255) NOT NULL,
	"resourceArn" varchar(512),
	"resourceType" varchar(100) NOT NULL,
	"resourceName" varchar(255),
	"awsAccountId" varchar(12),
	"region" varchar(50) NOT NULL,
	"availabilityZone" varchar(50),
	"status" varchar(50),
	"state" jsonb,
	"properties" jsonb,
	"configuration" jsonb,
	"security" jsonb,
	"cpuAverage" real,
	"cpuPeak" real,
	"cpuUnit" varchar(20),
	"memoryAverage" real,
	"memoryPeak" real,
	"memoryUnit" varchar(20),
	"storageUsed" real,
	"storageAllocated" real,
	"storageUnit" varchar(20),
	"networkInbound" real,
	"networkOutbound" real,
	"networkUnit" varchar(20),
	"costEstimated" real,
	"costActual" real,
	"costCurrency" varchar(3) DEFAULT 'USD',
	"costBillingPeriod" varchar(50),
	"costLastUpdated" timestamp,
	"cfStackId" varchar(255),
	"cfStackName" varchar(255),
	"cfLogicalId" varchar(255),
	"migrationCategory" varchar(20) DEFAULT 'uncategorized',
	"migrationNotes" text,
	"categorizedAt" timestamp,
	"categorizedBy" varchar(255),
	"collectedAt" timestamp DEFAULT NOW(),
	"collectorVersion" varchar(50),
	"lastSyncedAt" timestamp,
	"syncStatus" varchar(20) DEFAULT 'pending',
	"errors" jsonb,
	"warnings" jsonb,
	"resourceCreatedAt" timestamp,
	"resourceModifiedAt" timestamp,
	"resourceTerminatedAt" timestamp,
	"createdAt" timestamp DEFAULT NOW() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "aws-resources_resource_resourceId_unique" UNIQUE("resourceId")
);
--> statement-breakpoint
CREATE TABLE "aws-resources_session" (
	"sessionToken" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws-resources_snapshot_resource" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshotId" varchar(255) NOT NULL,
	"resourceId" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aws-resources_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp DEFAULT NOW(),
	"image" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "aws-resources_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "aws-resources_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "aws-resources_account" ADD CONSTRAINT "aws-resources_account_userId_aws-resources_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."aws-resources_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping_dependency" ADD CONSTRAINT "aws-resources_migration_mapping_dependency_mappingId_aws-resources_migration_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."aws-resources_migration_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping_tag" ADD CONSTRAINT "aws-resources_migration_mapping_tag_mappingId_aws-resources_migration_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."aws-resources_migration_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping_target" ADD CONSTRAINT "aws-resources_migration_mapping_target_mappingId_aws-resources_migration_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."aws-resources_migration_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_post" ADD CONSTRAINT "aws-resources_post_createdById_aws-resources_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."aws-resources_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_resource_relationship" ADD CONSTRAINT "aws-resources_resource_relationship_sourceResourceId_aws-resources_resource_resourceId_fk" FOREIGN KEY ("sourceResourceId") REFERENCES "public"."aws-resources_resource"("resourceId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_resource_tag" ADD CONSTRAINT "aws-resources_resource_tag_resourceId_aws-resources_resource_resourceId_fk" FOREIGN KEY ("resourceId") REFERENCES "public"."aws-resources_resource"("resourceId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_session" ADD CONSTRAINT "aws-resources_session_userId_aws-resources_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."aws-resources_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_snapshot_resource" ADD CONSTRAINT "aws-resources_snapshot_resource_snapshotId_aws-resources_resource_snapshot_snapshotId_fk" FOREIGN KEY ("snapshotId") REFERENCES "public"."aws-resources_resource_snapshot"("snapshotId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aws-resources_snapshot_resource" ADD CONSTRAINT "aws-resources_snapshot_resource_resourceId_aws-resources_resource_resourceId_fk" FOREIGN KEY ("resourceId") REFERENCES "public"."aws-resources_resource"("resourceId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "aws-resources_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "mapping_dep_mapping_id_idx" ON "aws-resources_migration_mapping_dependency" USING btree ("mappingId");--> statement-breakpoint
CREATE INDEX "mapping_dep_resource_id_idx" ON "aws-resources_migration_mapping_dependency" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "mapping_dep_dependency_type_idx" ON "aws-resources_migration_mapping_dependency" USING btree ("dependencyType");--> statement-breakpoint
CREATE INDEX "mapping_tag_mapping_id_idx" ON "aws-resources_migration_mapping_tag" USING btree ("mappingId");--> statement-breakpoint
CREATE INDEX "mapping_tag_key_idx" ON "aws-resources_migration_mapping_tag" USING btree ("key");--> statement-breakpoint
CREATE INDEX "mapping_tag_key_value_idx" ON "aws-resources_migration_mapping_tag" USING btree ("key","value");--> statement-breakpoint
CREATE INDEX "mapping_target_mapping_id_idx" ON "aws-resources_migration_mapping_target" USING btree ("mappingId");--> statement-breakpoint
CREATE INDEX "mapping_target_resource_id_idx" ON "aws-resources_migration_mapping_target" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "mapping_target_category_idx" ON "aws-resources_migration_mapping_target" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mapping_group_id_idx" ON "aws-resources_migration_mapping" USING btree ("mappingGroupId");--> statement-breakpoint
CREATE INDEX "mapping_source_resource_id_idx" ON "aws-resources_migration_mapping" USING btree ("sourceResourceId");--> statement-breakpoint
CREATE INDEX "mapping_source_category_idx" ON "aws-resources_migration_mapping" USING btree ("sourceCategory");--> statement-breakpoint
CREATE INDEX "mapping_direction_idx" ON "aws-resources_migration_mapping" USING btree ("mappingDirection");--> statement-breakpoint
CREATE INDEX "mapping_migration_status_idx" ON "aws-resources_migration_mapping" USING btree ("migrationStatus");--> statement-breakpoint
CREATE INDEX "mapping_category_idx" ON "aws-resources_migration_mapping" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mapping_priority_idx" ON "aws-resources_migration_mapping" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "mapping_risk_level_idx" ON "aws-resources_migration_mapping" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "aws-resources_post" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "name_idx" ON "aws-resources_post" USING btree ("name");--> statement-breakpoint
CREATE INDEX "rel_source_resource_id_idx" ON "aws-resources_resource_relationship" USING btree ("sourceResourceId");--> statement-breakpoint
CREATE INDEX "rel_target_resource_id_idx" ON "aws-resources_resource_relationship" USING btree ("targetResourceId");--> statement-breakpoint
CREATE INDEX "rel_relationship_type_idx" ON "aws-resources_resource_relationship" USING btree ("relationshipType");--> statement-breakpoint
CREATE INDEX "snapshot_id_idx" ON "aws-resources_resource_snapshot" USING btree ("snapshotId");--> statement-breakpoint
CREATE INDEX "snapshot_profile_idx" ON "aws-resources_resource_snapshot" USING btree ("profile");--> statement-breakpoint
CREATE INDEX "snapshot_region_idx" ON "aws-resources_resource_snapshot" USING btree ("region");--> statement-breakpoint
CREATE INDEX "snapshot_timestamp_idx" ON "aws-resources_resource_snapshot" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "snapshot_profile_region_timestamp_idx" ON "aws-resources_resource_snapshot" USING btree ("profile","region","timestamp");--> statement-breakpoint
CREATE INDEX "tag_resource_id_idx" ON "aws-resources_resource_tag" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "tag_key_idx" ON "aws-resources_resource_tag" USING btree ("key");--> statement-breakpoint
CREATE INDEX "tag_key_value_idx" ON "aws-resources_resource_tag" USING btree ("key","value");--> statement-breakpoint
CREATE INDEX "resource_id_idx" ON "aws-resources_resource" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "resource_type_idx" ON "aws-resources_resource" USING btree ("resourceType");--> statement-breakpoint
CREATE INDEX "region_idx" ON "aws-resources_resource" USING btree ("region");--> statement-breakpoint
CREATE INDEX "status_idx" ON "aws-resources_resource" USING btree ("status");--> statement-breakpoint
CREATE INDEX "migration_category_idx" ON "aws-resources_resource" USING btree ("migrationCategory");--> statement-breakpoint
CREATE INDEX "resource_type_region_idx" ON "aws-resources_resource" USING btree ("resourceType","region");--> statement-breakpoint
CREATE INDEX "collected_at_idx" ON "aws-resources_resource" USING btree ("collectedAt");--> statement-breakpoint
CREATE INDEX "cf_stack_name_idx" ON "aws-resources_resource" USING btree ("cfStackName");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "aws-resources_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sr_snapshot_id_idx" ON "aws-resources_snapshot_resource" USING btree ("snapshotId");--> statement-breakpoint
CREATE INDEX "sr_resource_id_idx" ON "aws-resources_snapshot_resource" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "unique_snapshot_resource_idx" ON "aws-resources_snapshot_resource" USING btree ("snapshotId","resourceId");