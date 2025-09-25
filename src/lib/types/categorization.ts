import type { RouterOutputs } from "@/trpc/react";
import type { LucideIcon } from "lucide-react";

export type Category = "old" | "new" | "uncategorized";
export type SortField = "name" | "type" | "region";
export type SortOrder = "asc" | "desc";

// Use tRPC inferred resource type
export type Resource =
	RouterOutputs["resources"]["categorized"]["resources"][0];

export interface FilterState {
	search: string;
	type: string;
	region: string;
}

export interface CategoryFilters {
	old: FilterState;
	new: FilterState;
	uncategorized: FilterState;
}

export interface GlobalState {
	selectedResources: Set<string>;
	sortBy: SortField;
	sortOrder: SortOrder;
	bulkActionDialog: boolean;
	bulkActionData: {
		category: Category;
		notes: string;
	};
}

export interface CategoryConfig {
	key: Category;
	title: string;
	description: string;
	icon: LucideIcon;
	color: "primary" | "destructive" | "secondary";
}

export interface ResourceCardProps {
	resource: Resource;
	isSelected: boolean;
	onSelect: (id: string) => void;
	category: Category;
	onCategorize: (resourceId: string, newCategory: Category) => void;
}

export interface CategoryColumnProps {
	category: Category;
	title: string;
	description: string;
	icon: LucideIcon;
	children: React.ReactNode;
	count: number;
	color?: "primary" | "destructive" | "secondary";
}

export interface ColumnFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	typeFilter: string;
	onTypeFilterChange: (value: string) => void;
	regionFilter: string;
	onRegionFilterChange: (value: string) => void;
	uniqueTypes: string[];
	uniqueRegions: string[];
	onClearFilters: () => void;
	placeholder?: string;
}

export interface BulkActionsBarProps {
	selectedCount: number;
	onClearSelection: () => void;
	onBulkCategorize: (category: Category) => Promise<void>;
}

export interface ProgressHeaderProps {
	stats?: RouterOutputs["resources"]["categories"];
}

export interface GlobalActionsProps {
	sortBy: SortField;
	sortOrder: SortOrder;
	onSortChange: (field: SortField, order: SortOrder) => void;
	onClearAllFilters: () => void;
	selectedCount: number;
	onBulkActionClick: () => void;
}

export interface UseCategorization {
	// State
	filters: CategoryFilters;
	globalState: GlobalState;

	// Data
	stats?: RouterOutputs["resources"]["categories"];
	resources: {
		old: Resource[];
		new: Resource[];
		uncategorized: Resource[];
	};
	filteredResources: {
		old: Resource[];
		new: Resource[];
		uncategorized: Resource[];
	};
	uniqueTypes: string[];
	uniqueRegions: string[];

	// Loading states
	loading: {
		stats: boolean;
		old: boolean;
		new: boolean;
		uncategorized: boolean;
	};

	// Actions
	updateFilter: (
		category: Category,
		field: keyof FilterState,
		value: string,
	) => void;
	clearColumnFilters: (category: Category) => void;
	clearAllFilters: () => void;
	toggleResourceSelection: (resourceId: string) => void;
	selectAll: (resources: Resource[]) => void;
	deselectAll: (resources: Resource[]) => void;
	handleResourceCategorize: (
		resourceId: string,
		targetCategory: Category,
	) => Promise<void>;
	handleBulkCategorize: (category?: Category, notes?: string) => Promise<void>;
	setSortBy: (field: SortField) => void;
	setSortOrder: (order: SortOrder) => void;
	setBulkActionDialog: (open: boolean) => void;
	setBulkActionData: (data: { category: Category; notes: string }) => void;
	setSelectedResources: (resources: Set<string>) => void;
}
