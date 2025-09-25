import { useDebounce } from "@/hooks/use-debounce";
import { DEBOUNCE_DELAY } from "@/lib/constants/categorization";
import type { Category, Resource } from "@/lib/types/categorization";
import { type RouterOutputs, api } from "@/trpc/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

// Mapping-specific types
export type MappingStatus = "mapped" | "unmapped" | "pending";
export type SortField = "name" | "type" | "region" | "mappedTo";
export type SortOrder = "asc" | "desc";

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
	selectedMapping: any | null;
	pendingMappings: any[];
}

export interface MappingResource extends Resource {
	mappingStatus: MappingStatus;
	mappedToResourceId?: string;
	mappedToResourceName?: string;
	mappingNotes?: string;
	mappedAt?: string;
	mappedBy?: string;
	confidence?: number;
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

export interface UseMapping {
	// State
	filters: FilterState;
	globalState: GlobalState;

	// Data
	stats?: MappingStats;
	resources: MappingResource[];
	categorizedResources: {
		old: MappingResource[];
		new: MappingResource[];
		uncategorized: MappingResource[];
	};
	filteredResources: MappingResource[];
	mappings: any[];
	suggestedMappings: Record<string, MappingResource[]>;
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
	selectAll: (resourceList: MappingResource[]) => void;
	deselectAll: () => void;
	handleResourceMap: (
		resourceId: string,
		targetResourceId: string,
		notes?: string,
	) => Promise<void>;
	handleManyToManyResourceMap: (
		sourceResourceId: string,
		targetResourceIds: string[],
		options?: any,
	) => Promise<any>;
	handleResourceUnmap: (resourceId: string) => Promise<void>;
	handleBulkMap: (mappingList: any[]) => Promise<void>;
	acceptPendingMapping: (mapping: any) => Promise<void>;
	rejectPendingMapping: (mapping: any) => Promise<void>;
	setSortBy: (field: SortField) => void;
	setSortOrder: (order: SortOrder) => void;
	setShowMappingDialog: (open: boolean) => void;
	setShowBulkMappingDialog: (open: boolean) => void;
	setSelectedMapping: (mapping: any) => void;
	setSelectedResources: (resourceSet: Set<string>) => void;
}

export function useMapping(): UseMapping {
	// Filter states
	const [filters, setFilters] = useState<FilterState>({
		search: "",
		type: "all",
		region: "all",
		mappingStatus: "all",
	});

	// Global state
	const [globalState, setGlobalState] = useState<GlobalState>({
		selectedResources: new Set<string>(),
		sortBy: "name",
		sortOrder: "asc",
		showMappingDialog: false,
		showBulkMappingDialog: false,
		selectedMapping: null,
		pendingMappings: [],
	});

	const [suggestedMappings, setSuggestedMappings] = useState<
		Record<string, MappingResource[]>
	>({});

	// Debounced search
	const debouncedSearch = useDebounce(filters.search, DEBOUNCE_DELAY);

	// Data fetching with tRPC
	const {
		data: oldResourcesData,
		isLoading: oldLoading,
		refetch: refetchOld,
	} = api.resources.categorized.useQuery({
		category: "old",
		limit: 250,
		...(debouncedSearch?.trim() && { search: debouncedSearch }),
		...(filters.type !== "all" && { type: filters.type }),
		...(filters.region !== "all" && { region: filters.region }),
	});

	const {
		data: newResourcesData,
		isLoading: newLoading,
		refetch: refetchNew,
	} = api.resources.categorized.useQuery({
		category: "new",
		limit: 250,
		...(debouncedSearch?.trim() && { search: debouncedSearch }),
		...(filters.type !== "all" && { type: filters.type }),
		...(filters.region !== "all" && { region: filters.region }),
	});

	const {
		data: mappingsData,
		isLoading: mappingsLoading,
		refetch: refetchMappings,
	} = api.migration.mappings.useQuery({
		limit: 250,
	});

	// Mutations
	const createMapping = api.migration.createMapping.useMutation();

	// Extract resources from API responses
	const oldResources = oldResourcesData?.resources || [];
	const newResources = newResourcesData?.resources || [];
	const mappings = mappingsData?.mappings || [];

	// Transform resources with mapping status
	const transformResourcesWithMappingStatus = useCallback(
		(resourceList: Resource[]): MappingResource[] => {
			if (!resourceList) return [];

			const mappedAsSourceIds = new Set(
				mappings.map((m) => m.sourceResourceId),
			);
			// Also track resources that are mapped as targets
			const mappedAsTargetIds = new Set(
				mappings.flatMap(
					(m) =>
						(m as any).targetResources?.map((t: any) => t.resourceId) || [],
				),
			);
			const allMappedResourceIds = new Set([
				...mappedAsSourceIds,
				...mappedAsTargetIds,
			]);
			const pendingResourceIds = new Set(
				globalState.pendingMappings.map((m) => m.oldResourceId),
			);

			return resourceList.map(
				(resource): MappingResource => ({
					...resource,
					mappingStatus: pendingResourceIds.has(resource.resourceId)
						? "pending"
						: allMappedResourceIds.has(resource.resourceId)
							? "mapped"
							: "unmapped",
					mappedToResourceId: mappings
						.find((m) => m.sourceResourceId === resource.resourceId)
						?.id?.toString(),
					mappedToResourceName: mappings.find(
						(m) => m.sourceResourceId === resource.resourceId,
					)?.sourceResourceName || undefined,
					mappingNotes: mappings.find(
						(m) => m.sourceResourceId === resource.resourceId,
					)?.notes || undefined,
					mappedAt: mappings.find(
						(m) => m.sourceResourceId === resource.resourceId,
					)?.createdAt?.toISOString(),
					mappedBy: "user", // Default for now
					confidence: 90, // Default confidence
				}),
			);
		},
		[mappings, globalState.pendingMappings],
	);

	// Categorized resources with mapping status
	const categorizedResources = useMemo(
		() => ({
			old: transformResourcesWithMappingStatus(oldResources),
			new: transformResourcesWithMappingStatus(newResources),
			uncategorized: [] as MappingResource[], // Not needed for mapping
		}),
		[transformResourcesWithMappingStatus, oldResources, newResources],
	);

	// All resources combined
	const allResources = useMemo(
		() => [...categorizedResources.old, ...categorizedResources.new],
		[categorizedResources],
	);

	// Filtered resources (apply additional filtering beyond API)
	const filteredResources = useMemo(() => {
		return allResources.filter((resource) => {
			if (
				filters.mappingStatus !== "all" &&
				resource.mappingStatus !== filters.mappingStatus
			) {
				return false;
			}
			return true;
		});
	}, [allResources, filters.mappingStatus]);

	// Get unique values for filters
	const uniqueTypes = useMemo(
		() => Array.from(new Set(allResources.map((r) => r.resourceType))).sort(),
		[allResources],
	);

	const uniqueRegions = useMemo(
		() => Array.from(new Set(allResources.map((r) => r.region))).sort(),
		[allResources],
	);

	const uniqueStatuses: MappingStatus[] = useMemo(
		() => ["mapped", "unmapped", "pending"],
		[],
	);

	// Calculate stats
	const mappingStats = useMemo((): MappingStats | undefined => {
		if (!allResources.length) return undefined;

		const mapped = allResources.filter(
			(r) => r.mappingStatus === "mapped",
		).length;
		const unmapped = allResources.filter(
			(r) => r.mappingStatus === "unmapped",
		).length;
		const pending = allResources.filter(
			(r) => r.mappingStatus === "pending",
		).length;

		const confidenceCounts = allResources.reduce(
			(acc, resource) => {
				const confidence = resource.confidence;
				if (confidence !== undefined) {
					if (confidence >= 80) acc.high++;
					else if (confidence >= 60) acc.medium++;
					else acc.low++;
				}
				return acc;
			},
			{ high: 0, medium: 0, low: 0 },
		);

		return {
			total: allResources.length,
			mapped,
			unmapped,
			pending,
			confidence: confidenceCounts,
		};
	}, [allResources]);

	// Refetch all data
	const refetchAll = useCallback(() => {
		refetchOld();
		refetchNew();
		refetchMappings();
	}, [refetchOld, refetchNew, refetchMappings]);

	// Filter actions
	const updateFilter = useCallback(
		(field: keyof FilterState, value: string) => {
			setFilters((prev) => ({
				...prev,
				[field]: value,
			}));
		},
		[],
	);

	const clearFilters = useCallback(() => {
		setFilters({
			search: "",
			type: "all",
			region: "all",
			mappingStatus: "all",
		});
		setGlobalState((prev) => ({
			...prev,
			selectedResources: new Set(),
		}));
	}, []);

	// Resource selection
	const toggleResourceSelection = useCallback((resourceId: string) => {
		setGlobalState((prev) => {
			const newSelection = new Set(prev.selectedResources);
			if (newSelection.has(resourceId)) {
				newSelection.delete(resourceId);
			} else {
				newSelection.add(resourceId);
			}
			return {
				...prev,
				selectedResources: newSelection,
			};
		});
	}, []);

	const selectAll = useCallback((resourceList: MappingResource[]) => {
		setGlobalState((prev) => {
			const resourceIds = resourceList.map((r) => r.resourceId);
			return {
				...prev,
				selectedResources: new Set([...prev.selectedResources, ...resourceIds]),
			};
		});
	}, []);

	const deselectAll = useCallback(() => {
		setGlobalState((prev) => ({
			...prev,
			selectedResources: new Set(),
		}));
	}, []);

	// Mapping actions
	const handleResourceMap = useCallback(
		async (resourceId: string, targetResourceId: string, notes?: string) => {
			try {
				await createMapping.mutateAsync({
					sourceResourceId: resourceId,
					targetResourceIds: [targetResourceId],
					mappingDirection: "old_to_new",
					mappingType: "replacement",
					notes: notes || `Mapped ${resourceId} to ${targetResourceId}`,
					priority: "medium",
					category: "undecided",
				});

				toast.success("Resource mapped successfully");
				refetchAll();
			} catch (error) {
				console.error("Failed to map resource:", error);
				toast.error("Failed to map resource");
			}
		},
		[createMapping, refetchAll],
	);

	const handleManyToManyResourceMap = useCallback(
		async (
			sourceResourceId: string,
			targetResourceIds: string[],
			options?: {
				mappingDirection?: string;
				mappingType?: string;
				notes?: string;
			},
		) => {
			try {
				const result = await createMapping.mutateAsync({
					sourceResourceId,
					targetResourceIds,
					mappingDirection: options?.mappingDirection || "old_to_new",
					mappingType: options?.mappingType || "replacement",
					notes:
						options?.notes ||
						`Mapped ${sourceResourceId} to ${targetResourceIds.length} target resources`,
					priority: "medium",
					category: "undecided",
				});

				toast.success(
					`Successfully mapped 1 source resource to ${targetResourceIds.length} target resources`,
				);
				refetchAll();
				return result;
			} catch (error) {
				console.error("Failed to create many-to-many mapping:", error);
				toast.error("Failed to create many-to-many mapping");
			}
		},
		[createMapping, refetchAll],
	);

	const handleResourceUnmap = useCallback(async (resourceId: string) => {
		try {
			// TODO: Implement unmap functionality when API is available
			toast.error("Unmapping not yet implemented");
		} catch (error) {
			console.error("Failed to unmap resource:", error);
			toast.error("Failed to unmap resource");
		}
	}, []);

	const handleBulkMap = useCallback(
		async (
			mappingList: {
				resourceId: string;
				targetResourceId: string;
				notes?: string;
			}[],
		) => {
			if (mappingList.length === 0) {
				toast.error("No mappings to process");
				return;
			}

			try {
				await Promise.all(
					mappingList.map((mapping) =>
						createMapping.mutateAsync({
							sourceResourceId: mapping.resourceId,
							targetResourceIds: [mapping.targetResourceId],
							mappingDirection: "old_to_new",
							mappingType: "replacement",
							notes: mapping.notes || `Bulk mapped ${mapping.resourceId}`,
							priority: "medium",
							category: "undecided",
						}),
					),
				);

				toast.success(`Successfully mapped ${mappingList.length} resources`);
				setGlobalState((prev) => ({
					...prev,
					selectedResources: new Set(),
					showBulkMappingDialog: false,
				}));
				refetchAll();
			} catch (error) {
				console.error("Failed to bulk map resources:", error);
				toast.error("Failed to bulk map resources");
			}
		},
		[createMapping, refetchAll],
	);

	const acceptPendingMapping = useCallback(
		async (mapping: any) => {
			try {
				await createMapping.mutateAsync({
					sourceResourceId: mapping.oldResourceId,
					targetResourceIds: [mapping.newResourceId],
					mappingDirection: "old_to_new",
					mappingType: "replacement",
					notes: mapping.notes || "Accepted pending mapping",
					priority: "medium",
					category: "undecided",
				});

				setGlobalState((prev) => ({
					...prev,
					pendingMappings: prev.pendingMappings.filter(
						(m) =>
							m.oldResourceId !== mapping.oldResourceId ||
							m.newResourceId !== mapping.newResourceId,
					),
				}));

				toast.success("Mapping accepted");
				refetchAll();
			} catch (error) {
				console.error("Failed to accept mapping:", error);
				toast.error("Failed to accept mapping");
			}
		},
		[createMapping, refetchAll],
	);

	const rejectPendingMapping = useCallback(async (mapping: any) => {
		try {
			setGlobalState((prev) => ({
				...prev,
				pendingMappings: prev.pendingMappings.filter(
					(m) =>
						m.oldResourceId !== mapping.oldResourceId ||
						m.newResourceId !== mapping.newResourceId,
				),
			}));

			toast.success("Mapping rejected");
		} catch (error) {
			console.error("Failed to reject mapping:", error);
			toast.error("Failed to reject mapping");
		}
	}, []);

	// Global state setters
	const setSortBy = useCallback((field: SortField) => {
		setGlobalState((prev) => ({ ...prev, sortBy: field }));
	}, []);

	const setSortOrder = useCallback((order: SortOrder) => {
		setGlobalState((prev) => ({ ...prev, sortOrder: order }));
	}, []);

	const setShowMappingDialog = useCallback((open: boolean) => {
		setGlobalState((prev) => ({ ...prev, showMappingDialog: open }));
	}, []);

	const setShowBulkMappingDialog = useCallback((open: boolean) => {
		setGlobalState((prev) => ({ ...prev, showBulkMappingDialog: open }));
	}, []);

	const setSelectedMapping = useCallback((mapping: any) => {
		setGlobalState((prev) => ({ ...prev, selectedMapping: mapping }));
	}, []);

	const setSelectedResources = useCallback((resourceSet: Set<string>) => {
		setGlobalState((prev) => ({ ...prev, selectedResources: resourceSet }));
	}, []);

	return {
		// State
		filters,
		globalState,

		// Data
		stats: mappingStats,
		resources: allResources,
		categorizedResources,
		filteredResources,
		mappings,
		suggestedMappings,
		uniqueTypes,
		uniqueRegions,
		uniqueStatuses,

		// Loading states
		loading: {
			stats: false, // Computed locally
			resources: oldLoading || newLoading,
			mappings: mappingsLoading,
		},

		// Actions
		updateFilter,
		clearFilters,
		toggleResourceSelection,
		selectAll,
		deselectAll,
		handleResourceMap,
		handleManyToManyResourceMap,
		handleResourceUnmap,
		handleBulkMap,
		acceptPendingMapping,
		rejectPendingMapping,
		setSortBy,
		setSortOrder,
		setShowMappingDialog,
		setShowBulkMappingDialog,
		setSelectedMapping,
		setSelectedResources,
	};
}
