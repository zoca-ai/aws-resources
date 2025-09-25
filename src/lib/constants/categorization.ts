import type { CategoryConfig, FilterState } from "@/lib/types/categorization";
import { AlertTriangle, Server, ServerCrash } from "lucide-react";

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

export const CATEGORY_CONFIGS: CategoryConfig[] = [
	{
		key: "old",
		title: "Legacy Resources",
		description: "Resources that need migration or replacement",
		icon: ServerCrash,
		color: "destructive",
	},
	{
		key: "new",
		title: "Modern Resources",
		description: "Terraform-managed or newly created resources",
		icon: Server,
		color: "primary",
	},
	{
		key: "uncategorized",
		title: "Uncategorized",
		description: "Resources awaiting categorization",
		icon: AlertTriangle,
		color: "secondary",
	},
];

export const DEFAULT_FILTER_STATE: FilterState = {
	search: "",
	type: "all",
	region: "all",
};

export const SORT_OPTIONS = [
	{ value: "name-asc", label: "Name A-Z" },
	{ value: "name-desc", label: "Name Z-A" },
	{ value: "type-asc", label: "Type A-Z" },
	{ value: "type-desc", label: "Type Z-A" },
	{ value: "region-asc", label: "Region A-Z" },
	{ value: "region-desc", label: "Region Z-A" },
];

export const DEBOUNCE_DELAY = 300;

export const SCROLL_AREA_HEIGHT = "calc(100vh - 340px)";

export const BULK_ACTION_LABELS = {
	old: "Mark as Legacy",
	new: "Mark as Modern",
	uncategorized: "Uncategorize",
};

export const BULK_ACTION_CATEGORIES = [
	{ value: "old", label: "Legacy (Old)" },
	{ value: "new", label: "Modern (New)" },
	{ value: "uncategorized", label: "Uncategorized" },
];

export const EMPTY_STATE_MESSAGES = {
	old: {
		title: "No legacy resources found",
		subtitle: "Try adjusting your filters",
	},
	new: {
		title: "No modern resources found",
		subtitle: "Try adjusting your filters",
	},
	uncategorized: {
		title: "All resources categorized!",
		subtitle: "Great job organizing your infrastructure",
		filtered: "Clear filters to see all categorized resources",
	},
} as const;

export type EmptyStateMessage =
	(typeof EMPTY_STATE_MESSAGES)[keyof typeof EMPTY_STATE_MESSAGES];
