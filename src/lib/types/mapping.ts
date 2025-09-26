import type { RouterOutputs } from "@/trpc/react";
import type { LucideIcon } from "lucide-react";

export type MappingStatus = "mapped" | "unmapped" | "pending";
export type SortField = "name" | "type" | "region" | "mappedTo";
export type SortOrder = "asc" | "desc";

// Use tRPC inferred resource type
export type Resource =
	RouterOutputs["resources"]["categorized"]["resources"][0];

// Use tRPC inferred migration mapping type
export type MigrationMapping =
	RouterOutputs["migration"]["mappings"]["mappings"][0];

export interface ResourceMapping {
	oldResourceId: string;
	newResourceId: string;
	confidence: number;
	reason: string;
	status: MappingStatus;
	notes?: string;
	mappedAt?: string;
	mappedBy?: string;
}

// Enhanced many-to-many mapping types
export interface EnhancedResourceMapping {
	mappingGroupId: string;
	sourceResource: {
		resourceId: string;
		resourceType: string;
		resourceName?: string;
		category: "old" | "new" | "uncategorized";
	};
	targetResources: Array<{
		resourceId: string;
		resourceType: string;
		resourceName?: string;
		category: "old" | "new" | "uncategorized";
		mappingType: "replacement" | "consolidation" | "split" | "dependency";
		mappingRatio?: number;
		notes?: string;
	}>;
	mappingDirection:
		| "old_to_new"
		| "new_to_old"
		| "old_to_old"
		| "new_to_new"
		| "any_to_any";
	migrationStatus:
		| "not_started"
		| "in_progress"
		| "migrated"
		| "verified"
		| "excluded"
		| "deprecated"
		| "rollback";
	createdAt: string;
	updatedAt: string;
}

export interface FilterState {
	search: string;
	type: string;
	region: string;
	mappingStatus: string;
}

export interface GlobalState {
	selectedResources: Set<string>;
	sortBy: SortField;
	sortOrder: SortOrder;
	showMappingDialog: boolean;
	showBulkMappingDialog: boolean;
	selectedMapping: ResourceMapping | null;
	pendingMappings: ResourceMapping[];
}

export interface MappingStats {
	total: number;
	mapped: number;
	unmapped: number;
	pending: number;
	confidence: {
		high: number;
		medium: number;
		low: number;
	};
}

// ResourceMappingCardProps is now defined in the component file using MappingResource

export interface MappingFiltersProps {
	filters: FilterState;
	onFilterChange: (field: keyof FilterState, value: string) => void;
	onClearFilters: () => void;
	uniqueTypes: string[];
	uniqueRegions: string[];
	uniqueStatuses: MappingStatus[];
}

export interface MappingStatsProps {
	stats?: MappingStats;
	loading?: boolean;
}

export interface PendingMappingsProps {
	mappings: ResourceMapping[];
	onAccept: (mapping: ResourceMapping) => void;
	onReject: (mapping: ResourceMapping) => void;
	onViewDetails: (mapping: ResourceMapping) => void;
	loading?: boolean;
}

export interface MappingPanelProps {
	resource: Resource | null;
	suggestedMappings: Resource[];
	onMap: (targetResourceIds: string[], notes?: string) => void;
	onClose: () => void;
	loading?: boolean;
}

export interface MappingDialogProps {
	open: boolean;
	onClose: () => void;
	resource: Resource | null;
	suggestedMappings: Resource[];
	onConfirm: (targetResourceIds: string[], notes?: string) => void;
	loading?: boolean;
}

export interface BulkMappingDialogProps {
	open: boolean;
	onClose: () => void;
	selectedResources: Resource[];
	onConfirm: (
		mappings: {
			resourceId: string;
			targetResourceId: string;
			notes?: string;
		}[],
	) => void;
	loading?: boolean;
}

export interface UseMapping {
	// State
	filters: FilterState;
	globalState: GlobalState;

	// Data
	stats?: MappingStats;
	resources: Resource[];
	categorizedResources: {
		old: Resource[];
		new: Resource[];
		uncategorized: Resource[];
	};
	filteredResources: Resource[];
	mappings: MigrationMapping[];
	suggestedMappings: Record<string, Resource[]>;
	uniqueTypes: string[];
	uniqueRegions: string[];
	uniqueStatuses: MappingStatus[];

	// Loading states
	loading: {
		stats: boolean;
		resources: boolean;
		mappings: boolean;
	};

	// Actions
	updateFilter: (field: keyof FilterState, value: string) => void;
	clearFilters: () => void;
	toggleResourceSelection: (resourceId: string) => void;
	selectAll: (resources: Resource[]) => void;
	deselectAll: () => void;
	handleResourceMap: (
		resourceId: string,
		targetResourceId: string,
		notes?: string,
	) => Promise<void>;
	handleManyToManyResourceMap: (
		sourceResourceId: string,
		targetResourceIds: string[],
		options?: {
			mappingDirection?: string;
			mappingType?: string;
			notes?: string;
		},
	) => Promise<any>;
	handleResourceUnmap: (resourceId: string) => Promise<void>;
	handleBulkMap: (
		mappings: {
			resourceId: string;
			targetResourceId: string;
			notes?: string;
		}[],
	) => Promise<void>;
	acceptPendingMapping: (mapping: ResourceMapping) => Promise<void>;
	rejectPendingMapping: (mapping: ResourceMapping) => Promise<void>;
	setSortBy: (field: SortField) => void;
	setSortOrder: (order: SortOrder) => void;
	setShowMappingDialog: (open: boolean) => void;
	setShowBulkMappingDialog: (open: boolean) => void;
	setSelectedMapping: (mapping: ResourceMapping | null) => void;
	setSelectedResources: (resources: Set<string>) => void;
}

export interface MappingConfig {
	key: MappingStatus;
	title: string;
	description: string;
	icon: LucideIcon;
	color: "primary" | "destructive" | "secondary" | "default";
}
