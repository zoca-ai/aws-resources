import type { FilterState, MappingConfig } from "@/lib/types/mapping";
import { Clock, Link, Link2Off } from "lucide-react";

export const RESOURCE_ICONS: Record<string, string> = {
	"ec2-instance": "🖥️",
	"rds-instance": "🗄️",
	"s3-bucket": "📦",
	"lambda-function": "⚡",
	vpc: "🌐",
	subnet: "🏠",
	"security-group": "🛡️",
	"ecs-cluster": "🚢",
	"ecs-service": "⚙️",
	"ecr-repository": "📦",
};

export const DEFAULT_RESOURCE_ICON = "📋";

export const MAPPING_CONFIGS: MappingConfig[] = [
	{
		key: "unmapped",
		title: "Unmapped Resources",
		description: "Resources that need to be mapped to new infrastructure",
		icon: Link2Off,
		color: "destructive",
	},
	{
		key: "mapped",
		title: "Mapped Resources",
		description: "Resources successfully mapped to new infrastructure",
		icon: Link,
		color: "primary",
	},
	{
		key: "pending",
		title: "Pending Mappings",
		description: "Suggested mappings awaiting confirmation",
		icon: Clock,
		color: "secondary",
	},
];

export const DEFAULT_FILTER_STATE: FilterState = {
	search: "",
	type: "all",
	region: "all",
	mappingStatus: "all",
};

export const SORT_OPTIONS = [
	{ value: "name-asc", label: "Name A-Z" },
	{ value: "name-desc", label: "Name Z-A" },
	{ value: "type-asc", label: "Type A-Z" },
	{ value: "type-desc", label: "Type Z-A" },
	{ value: "region-asc", label: "Region A-Z" },
	{ value: "region-desc", label: "Region Z-A" },
	{ value: "mappedTo-asc", label: "Mapped To A-Z" },
	{ value: "mappedTo-desc", label: "Mapped To Z-A" },
];

export const MAPPING_STATUS_OPTIONS = [
	{ value: "all", label: "All Statuses" },
	{ value: "mapped", label: "Mapped" },
	{ value: "unmapped", label: "Unmapped" },
	{ value: "pending", label: "Pending" },
];

export const CONFIDENCE_LEVELS = {
	HIGH: { min: 80, label: "High", color: "green" },
	MEDIUM: { min: 60, label: "Medium", color: "yellow" },
	LOW: { min: 0, label: "Low", color: "red" },
} as const;

export const DEBOUNCE_DELAY = 300;

export const SCROLL_AREA_HEIGHT = "calc(100vh - 400px)";

export const MAPPING_ACTION_LABELS = {
	map: "Map Resource",
	unmap: "Unmap Resource",
	accept: "Accept Mapping",
	reject: "Reject Mapping",
	bulkMap: "Bulk Map Selected",
} as const;

export const EMPTY_STATE_MESSAGES = {
	unmapped: {
		title: "No unmapped resources found",
		subtitle: "All resources have been mapped or are pending mapping",
	},
	mapped: {
		title: "No mapped resources found",
		subtitle: "Try adjusting your filters or start mapping resources",
	},
	pending: {
		title: "No pending mappings",
		subtitle: "All suggested mappings have been processed",
	},
	filtered: {
		title: "No resources match your filters",
		subtitle: "Try adjusting or clearing your search criteria",
	},
} as const;

export const MAPPING_REASONS = [
	"Similar resource type and configuration",
	"Matching tags and metadata",
	"Same naming pattern",
	"Geographic proximity",
	"Terraform resource relationship",
	"Manual mapping by administrator",
	"AI-suggested based on usage patterns",
] as const;

export const BULK_MAPPING_LIMITS = {
	MAX_SELECTIONS: 50,
	WARNING_THRESHOLD: 25,
} as const;

export const MAPPING_CONFIDENCE_COLORS = {
	high: "text-green-600 bg-green-50 border-green-200",
	medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
	low: "text-red-600 bg-red-50 border-red-200",
} as const;

export type EmptyStateMessage =
	(typeof EMPTY_STATE_MESSAGES)[keyof typeof EMPTY_STATE_MESSAGES];

// Enhanced many-to-many mapping constants
export const MAPPING_TYPES = [
	{
		value: "replacement",
		label: "Replacement",
		description: "Direct resource replacement",
	},
	{
		value: "consolidation",
		label: "Consolidation",
		description: "Multiple resources consolidated into fewer",
	},
	{
		value: "split",
		label: "Split",
		description: "One resource split into multiple",
	},
	{
		value: "dependency",
		label: "Dependency",
		description: "Related/dependent resources",
	},
] as const;

export const MAPPING_DIRECTIONS = [
	{
		value: "old_to_new",
		label: "Legacy → Modern",
		description: "Traditional migration direction",
	},
	{
		value: "new_to_old",
		label: "Modern → Legacy",
		description: "Reverse migration or rollback",
	},
	{
		value: "old_to_old",
		label: "Legacy → Legacy",
		description: "Within legacy systems",
	},
	{
		value: "new_to_new",
		label: "Modern → Modern",
		description: "Between modern systems",
	},
	{
		value: "any_to_any",
		label: "Flexible",
		description: "Any direction allowed",
	},
] as const;

export const MIGRATION_STATUS_OPTIONS = [
	{
		value: "not_started",
		label: "Not Started",
		color: "text-red-600 bg-red-50 border-red-200",
	},
	{
		value: "in_progress",
		label: "In Progress",
		color: "text-yellow-600 bg-yellow-50 border-yellow-200",
	},
	{
		value: "migrated",
		label: "Migrated",
		color: "text-green-600 bg-green-50 border-green-200",
	},
	{
		value: "verified",
		label: "Verified",
		color: "text-blue-600 bg-blue-50 border-blue-200",
	},
	{
		value: "excluded",
		label: "Excluded",
		color: "text-gray-600 bg-gray-50 border-gray-200",
	},
	{
		value: "deprecated",
		label: "Deprecated",
		color: "text-purple-600 bg-purple-50 border-purple-200",
	},
	{
		value: "rollback",
		label: "Rollback",
		color: "text-orange-600 bg-orange-50 border-orange-200",
	},
] as const;
