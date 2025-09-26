CREATE TABLE "aws-resources_migration_mapping_source" (
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
	"migrationReadiness" varchar(20) DEFAULT 'pending',
	"deprecationDate" timestamp,
	"lastUsedDate" timestamp,
	"businessCriticality" varchar(20) DEFAULT 'medium',
	"notes" text,
	"createdAt" timestamp DEFAULT NOW() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
DROP INDEX "mapping_source_resource_id_idx";--> statement-breakpoint
DROP INDEX "mapping_source_category_idx";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" ADD COLUMN "mappingName" varchar(255);--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" ADD COLUMN "mappingDescription" text;--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping_source" ADD CONSTRAINT "aws-resources_migration_mapping_source_mappingId_aws-resources_migration_mapping_id_fk" FOREIGN KEY ("mappingId") REFERENCES "public"."aws-resources_migration_mapping"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mapping_source_mapping_id_idx" ON "aws-resources_migration_mapping_source" USING btree ("mappingId");--> statement-breakpoint
CREATE INDEX "mapping_source_resource_id_idx" ON "aws-resources_migration_mapping_source" USING btree ("resourceId");--> statement-breakpoint
CREATE INDEX "mapping_source_resource_type_idx" ON "aws-resources_migration_mapping_source" USING btree ("resourceType");--> statement-breakpoint
CREATE INDEX "mapping_source_category_idx" ON "aws-resources_migration_mapping_source" USING btree ("category");--> statement-breakpoint
CREATE INDEX "mapping_source_migration_readiness_idx" ON "aws-resources_migration_mapping_source" USING btree ("migrationReadiness");--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceResourceId";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceResourceType";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceResourceName";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceResourceArn";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceRegion";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceAwsAccountId";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" DROP COLUMN "sourceCategory";--> statement-breakpoint
ALTER TABLE "aws-resources_migration_mapping" ADD CONSTRAINT "aws-resources_migration_mapping_mappingGroupId_unique" UNIQUE("mappingGroupId");