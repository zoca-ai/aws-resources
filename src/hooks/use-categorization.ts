import { useDebounce } from "@/hooks/use-debounce";
import {
	DEBOUNCE_DELAY,
	DEFAULT_FILTER_STATE,
} from "@/lib/constants/categorization";
import type {
	Category,
	CategoryFilters,
	FilterState,
	GlobalState,
	Resource,
	SortField,
	SortOrder,
	UseCategorization,
} from "@/lib/types/categorization";
import { type RouterOutputs, api } from "@/trpc/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

export function useCategorization(): UseCategorization {
	// Filter states for each category
	const [filters, setFilters] = useState<CategoryFilters>({
		old: { ...DEFAULT_FILTER_STATE },
		new: { ...DEFAULT_FILTER_STATE },
		uncategorized: { ...DEFAULT_FILTER_STATE },
	});

	// Global state
	const [globalState, setGlobalState] = useState<GlobalState>({
		selectedResources: new Set<string>(),
		sortBy: "name",
		sortOrder: "asc",
		bulkActionDialog: false,
		bulkActionData: { category: "old", notes: "" },
	});

	// Debounced searches
	const debouncedOldSearch = useDebounce(filters.old.search, DEBOUNCE_DELAY);
	const debouncedNewSearch = useDebounce(filters.new.search, DEBOUNCE_DELAY);
	const debouncedUncategorizedSearch = useDebounce(
		filters.uncategorized.search,
		DEBOUNCE_DELAY,
	);

	// Data fetching with tRPC - optimized with better caching
	const {
		data: stats,
		isLoading: statsLoading,
		refetch: refetchStats,
	} = api.resources.categories.useQuery(void 0, {
		staleTime: 3 * 60 * 1000, // 3 minutes
		refetchOnWindowFocus: true,
	});

	// Build query inputs, only include optional fields if they have values
	const oldQueryInput = {
		category: "old" as const,
		limit: 250,
		...(debouncedOldSearch?.trim() && { search: debouncedOldSearch }),
		...(filters.old.type !== "all" && { type: filters.old.type }),
		...(filters.old.region !== "all" && { region: filters.old.region }),
	};

	const newQueryInput = {
		category: "new" as const,
		limit: 250,
		...(debouncedNewSearch?.trim() && { search: debouncedNewSearch }),
		...(filters.new.type !== "all" && { type: filters.new.type }),
		...(filters.new.region !== "all" && { region: filters.new.region }),
	};

	const uncategorizedQueryInput = {
		category: "uncategorized" as const,
		limit: 250,
		...(debouncedUncategorizedSearch?.trim() && {
			search: debouncedUncategorizedSearch,
		}),
		...(filters.uncategorized.type !== "all" && {
			type: filters.uncategorized.type,
		}),
		...(filters.uncategorized.region !== "all" && {
			region: filters.uncategorized.region,
		}),
	};

	const {
		data: oldResourcesData,
		isLoading: oldLoading,
		refetch: refetchOld,
	} = api.resources.categorized.useQuery(oldQueryInput, {
		staleTime: 2 * 60 * 1000, // 2 minutes
		keepPreviousData: true, // Keep previous data while fetching new
	});

	const {
		data: newResourcesData,
		isLoading: newLoading,
		refetch: refetchNew,
	} = api.resources.categorized.useQuery(newQueryInput, {
		staleTime: 2 * 60 * 1000,
		keepPreviousData: true,
	});

	const {
		data: uncategorizedResourcesData,
		isLoading: uncategorizedLoading,
		refetch: refetchUncategorized,
	} = api.resources.categorized.useQuery(uncategorizedQueryInput, {
		staleTime: 2 * 60 * 1000,
		keepPreviousData: true,
	});

	// Get utils for optimistic updates
	const utils = api.useUtils();

	// Mutations with optimistic updates
	const categorizeResource = api.resources.categorize.useMutation({
		onMutate: async (variables) => {
			// Cancel outgoing refetches to avoid overwriting optimistic update
			await Promise.all([
				utils.resources.categories.cancel(),
				utils.resources.categorized.cancel(),
			]);

			// Snapshot previous values
			const previousStats = utils.resources.categories.getData();
			const previousOld = utils.resources.categorized.getData(oldQueryInput);
			const previousNew = utils.resources.categorized.getData(newQueryInput);
			const previousUncategorized = utils.resources.categorized.getData(uncategorizedQueryInput);

			// Optimistically update the UI
			toast.loading(`Categorizing resource as ${variables.category}...`, {
				id: `categorize-${variables.resourceId}`,
			});

			return {
				previousStats,
				previousOld,
				previousNew,
				previousUncategorized,
				variables,
			};
		},
		onError: (error, variables, context) => {
			// Rollback optimistic updates on error
			if (context) {
				if (context.previousStats) {
					utils.resources.categories.setData(undefined, context.previousStats);
				}
				if (context.previousOld) {
					utils.resources.categorized.setData(oldQueryInput, context.previousOld);
				}
				if (context.previousNew) {
					utils.resources.categorized.setData(newQueryInput, context.previousNew);
				}
				if (context.previousUncategorized) {
					utils.resources.categorized.setData(uncategorizedQueryInput, context.previousUncategorized);
				}
			}

			toast.error(`Failed to categorize resource: ${error.message}`, {
				id: `categorize-${variables.resourceId}`,
			});
		},
		onSuccess: (data, variables) => {
			toast.success(`Resource categorized as ${variables.category}`, {
				id: `categorize-${variables.resourceId}`,
			});

			// Invalidate queries to get fresh data
			utils.resources.categories.invalidate();
			utils.resources.categorized.invalidate();
		},
	});

	const bulkCategorizeResources = api.resources.bulkCategorize.useMutation({
		onMutate: async (variables) => {
			await Promise.all([
				utils.resources.categories.cancel(),
				utils.resources.categorized.cancel(),
			]);

			toast.loading(`Categorizing ${variables.resourceIds.length} resources...`, {
				id: 'bulk-categorize',
			});

			return { variables };
		},
		onError: (error, variables) => {
			toast.error(`Failed to categorize resources: ${error.message}`, {
				id: 'bulk-categorize',
			});
		},
		onSuccess: (data, variables) => {
			toast.success(`Successfully categorized ${variables.resourceIds.length} resources`, {
				id: 'bulk-categorize',
			});

			utils.resources.categories.invalidate();
			utils.resources.categorized.invalidate();
		},
	});

	// Extract resources from API responses
	const oldResources = oldResourcesData?.resources || [];
	const newResources = newResourcesData?.resources || [];
	const uncategorizedResources = uncategorizedResourcesData?.resources || [];

	// Resource sorting function (filtering now done server-side)
	const sortResources = useCallback(
		(resources: Resource[]): Resource[] => {
			if (!resources) return [];

			// Sort resources
			const sorted = [...resources].sort((a: Resource, b: Resource) => {
				let valueA: string;
				let valueB: string;

				switch (globalState.sortBy) {
					case "name":
						valueA = a.resourceName || a.resourceId;
						valueB = b.resourceName || b.resourceId;
						break;
					case "type":
						valueA = a.resourceType;
						valueB = b.resourceType;
						break;
					case "region":
						valueA = a.region;
						valueB = b.region;
						break;
					default:
						valueA = a.resourceId;
						valueB = b.resourceId;
				}

				const comparison = valueA.localeCompare(valueB);
				return globalState.sortOrder === "asc" ? comparison : -comparison;
			});

			return sorted;
		},
		[globalState.sortBy, globalState.sortOrder],
	);

	// Get sorted resources (filtering is now done server-side)
	const filteredResources = useMemo(
		() => ({
			old: sortResources(oldResources),
			new: sortResources(newResources),
			uncategorized: sortResources(uncategorizedResources),
		}),
		[oldResources, newResources, uncategorizedResources, sortResources],
	);

	// Get unique values for filters
	const allResources = useMemo(
		() => [...oldResources, ...newResources, ...uncategorizedResources],
		[oldResources, newResources, uncategorizedResources],
	);

	const uniqueTypes = useMemo(
		() => Array.from(new Set(allResources.map((r) => r.resourceType))).sort(),
		[allResources],
	);

	const uniqueRegions = useMemo(
		() => Array.from(new Set(allResources.map((r) => r.region))).sort(),
		[allResources],
	);

	// Refetch all data
	const refetchAll = useCallback(() => {
		refetchStats();
		refetchOld();
		refetchNew();
		refetchUncategorized();
	}, [refetchStats, refetchOld, refetchNew, refetchUncategorized]);

	// Filter actions
	const updateFilter = useCallback(
		(category: Category, field: keyof FilterState, value: string) => {
			setFilters((prev) => ({
				...prev,
				[category]: {
					...prev[category],
					[field]: value,
				},
			}));
		},
		[],
	);

	const clearColumnFilters = useCallback((category: Category) => {
		setFilters((prev) => ({
			...prev,
			[category]: { ...DEFAULT_FILTER_STATE },
		}));
	}, []);

	const clearAllFilters = useCallback(() => {
		setFilters({
			old: { ...DEFAULT_FILTER_STATE },
			new: { ...DEFAULT_FILTER_STATE },
			uncategorized: { ...DEFAULT_FILTER_STATE },
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

	const selectAll = useCallback((resources: Resource[]) => {
		setGlobalState((prev) => {
			const resourceIds = resources.map((r) => r.resourceId);
			return {
				...prev,
				selectedResources: new Set([...prev.selectedResources, ...resourceIds]),
			};
		});
	}, []);

	const deselectAll = useCallback((resources: Resource[]) => {
		setGlobalState((prev) => {
			const resourceIds = new Set(resources.map((r) => r.resourceId));
			return {
				...prev,
				selectedResources: new Set(
					[...prev.selectedResources].filter((id) => !resourceIds.has(id)),
				),
			};
		});
	}, []);

	// Resource categorization
	const handleResourceCategorize = useCallback(
		async (resourceId: string, targetCategory: Category) => {
			try {
				await categorizeResource.mutateAsync({
					resourceId,
					category: targetCategory,
					notes: `Categorized as ${targetCategory}`,
					categorizedBy: "user",
				});

				toast.success(`Resource categorized as ${targetCategory}`);
				refetchAll();
			} catch (error) {
				console.error("Failed to categorize resource:", error);
				toast.error("Failed to categorize resource");
			}
		},
		[categorizeResource, refetchAll],
	);

	// Bulk categorization
	const handleBulkCategorize = useCallback(
		async (category?: Category, notes?: string) => {
			if (globalState.selectedResources.size === 0) {
				toast.error("Please select resources to categorize");
				return;
			}

			// Use provided parameters or fall back to global state
			const targetCategory = category || globalState.bulkActionData.category;
			const targetNotes =
				notes ||
				globalState.bulkActionData.notes ||
				`Bulk categorized as ${targetCategory}`;

			try {
				await bulkCategorizeResources.mutateAsync({
					resourceIds: Array.from(globalState.selectedResources),
					category: targetCategory,
					notes: targetNotes,
					categorizedBy: "user",
				});

				toast.success(
					`Successfully categorized ${globalState.selectedResources.size} resources as ${targetCategory}`,
				);

				setGlobalState((prev) => ({
					...prev,
					selectedResources: new Set(),
					bulkActionDialog: false,
					bulkActionData: { category: "old", notes: "" },
				}));

				refetchAll();
			} catch (error) {
				console.error("Failed to bulk categorize resources:", error);
				toast.error("Failed to categorize resources");
			}
		},
		[globalState, bulkCategorizeResources, refetchAll],
	);

	// Global state setters
	const setSortBy = useCallback((field: SortField) => {
		setGlobalState((prev) => ({ ...prev, sortBy: field }));
	}, []);

	const setSortOrder = useCallback((order: SortOrder) => {
		setGlobalState((prev) => ({ ...prev, sortOrder: order }));
	}, []);

	const setBulkActionDialog = useCallback((open: boolean) => {
		setGlobalState((prev) => ({ ...prev, bulkActionDialog: open }));
	}, []);

	const setBulkActionData = useCallback(
		(data: { category: Category; notes: string }) => {
			setGlobalState((prev) => ({ ...prev, bulkActionData: data }));
		},
		[],
	);

	const setSelectedResources = useCallback((resources: Set<string>) => {
		setGlobalState((prev) => ({ ...prev, selectedResources: resources }));
	}, []);

	return {
		// State
		filters,
		globalState,

		// Data
		stats,
		resources: {
			old: oldResources,
			new: newResources,
			uncategorized: uncategorizedResources,
		},
		filteredResources,
		uniqueTypes,
		uniqueRegions,

		// Loading states
		loading: {
			stats: statsLoading,
			old: oldLoading,
			new: newLoading,
			uncategorized: uncategorizedLoading,
		},

		// Actions
		updateFilter,
		clearColumnFilters,
		clearAllFilters,
		toggleResourceSelection,
		selectAll,
		deselectAll,
		handleResourceCategorize,
		handleBulkCategorize,
		setSortBy,
		setSortOrder,
		setBulkActionDialog,
		setBulkActionData,
		setSelectedResources,
	};
}
