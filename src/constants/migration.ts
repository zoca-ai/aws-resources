/**
 * Migration-related constants
 */

export const MIGRATION_CATEGORIES = {
	OLD: "old",
	NEW: "new",
	UNCATEGORIZED: "uncategorized",
} as const;

export const MIGRATION_CATEGORY_VALUES = Object.values(MIGRATION_CATEGORIES);
export type MigrationCategory =
	(typeof MIGRATION_CATEGORIES)[keyof typeof MIGRATION_CATEGORIES];

export const MIGRATION_STATUS = {
	NOT_STARTED: "not_started",
	IN_PROGRESS: "in_progress",
	MIGRATED: "migrated",
	VERIFIED: "verified",
	EXCLUDED: "excluded",
	DEPRECATED: "deprecated",
	ROLLBACK: "rollback",
} as const;

export const MIGRATION_STATUS_VALUES = Object.values(MIGRATION_STATUS);
export type MigrationStatus =
	(typeof MIGRATION_STATUS)[keyof typeof MIGRATION_STATUS];

export const MIGRATION_MAPPING_CATEGORIES = {
	KEEP_MANUAL: "keep_manual",
	MIGRATE_TERRAFORM: "migrate_terraform",
	TO_BE_REMOVED: "to_be_removed",
	DEPRECATED: "deprecated",
	UNDECIDED: "undecided",
	STAGING: "staging",
	CHRONE: "chrone",
} as const;

export const MIGRATION_MAPPING_CATEGORY_VALUES = Object.values(
	MIGRATION_MAPPING_CATEGORIES,
);
export type MigrationMappingCategory =
	(typeof MIGRATION_MAPPING_CATEGORIES)[keyof typeof MIGRATION_MAPPING_CATEGORIES];

export const MIGRATION_PRIORITIES = {
	CRITICAL: "critical",
	HIGH: "high",
	MEDIUM: "medium",
	LOW: "low",
} as const;

export const MIGRATION_PRIORITY_VALUES = Object.values(MIGRATION_PRIORITIES);
export type MigrationPriority =
	(typeof MIGRATION_PRIORITIES)[keyof typeof MIGRATION_PRIORITIES];

export const MAPPING_DIRECTIONS = {
	OLD_TO_NEW: "old_to_new",
	NEW_TO_OLD: "new_to_old",
	OLD_TO_OLD: "old_to_old",
	NEW_TO_NEW: "new_to_new",
	ANY_TO_ANY: "any_to_any",
} as const;

export const MAPPING_DIRECTION_VALUES = Object.values(MAPPING_DIRECTIONS);
export type MappingDirection =
	(typeof MAPPING_DIRECTIONS)[keyof typeof MAPPING_DIRECTIONS];

export const MAPPING_TYPES = {
	REPLACEMENT: "replacement",
	CONSOLIDATION: "consolidation",
	SPLIT: "split",
	DEPENDENCY: "dependency",
	DEPRECATION: "deprecation",
	REMOVAL: "removal",
	ADDITION: "addition",
} as const;

export const MAPPING_TYPE_VALUES = Object.values(MAPPING_TYPES);
export type MappingType = (typeof MAPPING_TYPES)[keyof typeof MAPPING_TYPES];

export const RISK_LEVELS = {
	HIGH: "high",
	MEDIUM: "medium",
	LOW: "low",
} as const;

export const RISK_LEVEL_VALUES = Object.values(RISK_LEVELS);
export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];
