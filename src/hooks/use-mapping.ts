import { useDebounce } from "@/hooks/use-debounce";
import { DEBOUNCE_DELAY } from "@/lib/constants/categorization";
import type { Category, Resource } from "@/lib/types/categorization";
import { type RouterOutputs, api } from "@/trpc/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

	// Infinite scroll functions
	fetchNextPage: {
		old: () => void;
		new: () => void;
		mappings: () => void;
	};
	hasNextPage: {
		old: boolean;
		new: boolean;
		mappings: boolean;
	};
	isFetchingNextPage: {
		old: boolean;
		new: boolean;
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
	handleUpdateMappingNotes: (
		mappingId: number,
		notes: string,
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

	// Memoize query inputs with infinite scroll support
	const oldQueryInput = useMemo(() => ({
		category: "old" as const,
		limit: 50, // Smaller chunks for infinite scroll
		...(debouncedSearch?.trim() && { search: debouncedSearch }),
		...(filters.type !== "all" && { type: filters.type }),
		...(filters.region !== "all" && { region: filters.region }),
	}), [debouncedSearch, filters.type, filters.region]);

	const newQueryInput = useMemo(() => ({
		category: "new" as const,
		limit: 50,
		...(debouncedSearch?.trim() && { search: debouncedSearch }),
		...(filters.type !== "all" && { type: filters.type }),
		...(filters.region !== "all" && { region: filters.region }),
	}), [debouncedSearch, filters.type, filters.region]);

	const mappingsQueryInput = useMemo(() => ({
		limit: 100, // Load more mappings but still chunked
	}), []);

	// Use infinite queries for better performance
	const {
		data: oldResourcesData,
		isLoading: oldLoading,
		fetchNextPage: fetchNextOldPage,
		hasNextPage: hasNextOldPage,
		isFetchingNextPage: isFetchingNextOldPage,
	} = api.resources.categorizedInfinite.useInfiniteQuery(
		oldQueryInput,
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			staleTime: 2 * 60 * 1000,
		}
	);

	const {
		data: newResourcesData,
		isLoading: newLoading,
		fetchNextPage: fetchNextNewPage,
		hasNextPage: hasNextNewPage,
		isFetchingNextPage: isFetchingNextNewPage,
	} = api.resources.categorizedInfinite.useInfiniteQuery(
		newQueryInput,
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			staleTime: 2 * 60 * 1000,
		}
	);

	const {
		data: mappingsResponse,
		isLoading: mappingsLoading,
		refetch: refetchMappings,
		fetchNextPage: fetchNextMappingsPage,
		hasNextPage: hasNextMappingsPage,
		isFetchingNextPage: isFetchingNextMappingsPage,
	} = api.migration.mappingsInfinite.useInfiniteQuery(
		mappingsQueryInput,
		{
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			staleTime: 1 * 60 * 1000,
			refetchOnWindowFocus: true,
		}
	);


	// Get utils for optimistic updates
	const utils = api.useUtils();

	// Mutations with optimistic updates
	const updateMapping = api.migration.updateMapping.useMutation({
		onMutate: async () => {
			toast.loading('Updating mapping...', { id: 'update-mapping' });
		},
		onError: (error) => {
			toast.error(`Failed to update mapping: ${error.message}`, {
				id: 'update-mapping',
			});
		},
		onSuccess: () => {
			toast.success('Mapping updated successfully', { id: 'update-mapping' });
			utils.migration.mappingsInfinite.invalidate();
		},
	});

	const createMapping = api.migration.createMapping.useMutation({
		onMutate: async (variables) => {
			// Cancel outgoing refetches
			await Promise.all([
				utils.migration.mappings.cancel(),
				utils.resources.categorized.cancel(),
			]);

			toast.loading('Creating mapping...', { id: 'create-mapping' });

			return { variables };
		},
		onError: (error, variables) => {
			toast.error(`Failed to create mapping: ${error.message}`, {
				id: 'create-mapping',
			});
		},
		onSuccess: (data, variables) => {
			toast.success('Mapping created successfully', { id: 'create-mapping' });

			// Invalidate related queries
			utils.migration.mappingsInfinite.invalidate();
		},
	});

	// Extract and flatten resources from infinite query pages
	const oldResources = useMemo(() => {
		return oldResourcesData?.pages.flatMap(page => page.resources) || [];
	}, [oldResourcesData]);

	const newResources = useMemo(() => {
		return newResourcesData?.pages.flatMap(page => page.resources) || [];
	}, [newResourcesData]);

	const mappings = useMemo(() => {
		return mappingsResponse?.pages.flatMap(page => page.mappings) || [];
	}, [mappingsResponse]);

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

	// Background prefetching - automatically fetch next page when approaching end
	useEffect(() => {
		const prefetchTimer = setTimeout(() => {
			// Prefetch next old resources page if we have more than 25 resources and there's more to fetch
			if (oldResources.length > 25 && hasNextOldPage && !isFetchingNextOldPage) {
				fetchNextOldPage();
			}
			// Prefetch next new resources page
			if (newResources.length > 25 && hasNextNewPage && !isFetchingNextNewPage) {
				fetchNextNewPage();
			}
		}, 1500); // Wait 1.5 seconds before prefetching

		return () => clearTimeout(prefetchTimer);
	}, [
		oldResources.length, hasNextOldPage, isFetchingNextOldPage, fetchNextOldPage,
		newResources.length, hasNextNewPage, isFetchingNextNewPage, fetchNextNewPage
	]);

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
		utils.resources.categorizedInfinite.invalidate();
		utils.migration.mappingsInfinite.invalidate();
	}, [utils]);

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

	const handleUpdateMappingNotes = useCallback(
		async (mappingId: number, notes: string) => {
			try {
				await updateMapping.mutateAsync({
					id: mappingId,
					notes,
				});
				refetchAll();
			} catch (error) {
				console.error("Failed to update mapping notes:", error);
				toast.error("Failed to update mapping notes");
			}
		},
		[updateMapping, refetchAll],
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

		// Infinite scroll functions
		fetchNextPage: {
			old: fetchNextOldPage,
			new: fetchNextNewPage,
			mappings: () => {}, // No infinite scroll for mappings
		},
		hasNextPage: {
			old: hasNextOldPage,
			new: hasNextNewPage,
			mappings: false, // No infinite scroll for mappings
		},
		isFetchingNextPage: {
			old: isFetchingNextOldPage,
			new: isFetchingNextNewPage,
			mappings: false, // No infinite scroll for mappings
		},

		// Actions
		updateFilter,
		clearFilters,
		toggleResourceSelection,
		selectAll,
		deselectAll,
		handleResourceMap,
		handleUpdateMappingNotes,
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
