import { api } from "@/trpc/react";
import { useCallback, useMemo } from "react";

/**
 * Global app state hook using React Query for efficient data management
 * This provides centralized state that can be used across the entire app
 */
export function useAppState() {
  const utils = api.useUtils();

  // Core data queries with optimized caching
  const resources = api.resources.list.useQuery({}, {
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data?.resources || [],
  });

  const resourceTypes = api.resources.types.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const resourceCategories = api.resources.categories.useQuery(undefined, {
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  const collectorTypes = api.collector.types.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
  });

  const accountInfo = api.collector.account.useQuery(undefined, {
    staleTime: 15 * 60 * 1000, // 15 minutes - static data
    refetchOnWindowFocus: false,
  });

  const collectionJobs = api.collector.jobs.useQuery(undefined, {
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30000, // 30 seconds
  });

  // Computed global state
  const globalStats = useMemo(() => {
    const totalResources = resources.data?.length || 0;
    const totalTypes = resourceTypes.data?.length || 0;
    const categorizedCounts = resourceCategories.data || { old: 0, new: 0, uncategorized: 0 };

    return {
      totalResources,
      totalTypes,
      ...categorizedCounts,
      categorizationProgress: totalResources > 0
        ? ((categorizedCounts.old + categorizedCounts.new) / totalResources) * 100
        : 0,
    };
  }, [resources.data, resourceTypes.data, resourceCategories.data]);

  const isLoadingAny = useMemo(() => (
    resources.isLoading ||
    resourceTypes.isLoading ||
    resourceCategories.isLoading ||
    collectorTypes.isLoading
  ), [resources.isLoading, resourceTypes.isLoading, resourceCategories.isLoading, collectorTypes.isLoading]);

  const hasError = useMemo(() => (
    resources.error ||
    resourceTypes.error ||
    resourceCategories.error ||
    collectorTypes.error
  ), [resources.error, resourceTypes.error, resourceCategories.error, collectorTypes.error]);

  // Global actions
  const refreshAllData = useCallback(async () => {
    await Promise.all([
      utils.resources.list.invalidate(),
      utils.resources.types.invalidate(),
      utils.resources.categories.invalidate(),
      utils.collector.types.invalidate(),
      utils.collector.jobs.invalidate(),
    ]);
  }, [utils]);

  const invalidateResourceData = useCallback(() => {
    utils.resources.invalidate();
  }, [utils]);

  const prefetchResourceDetails = useCallback((resourceId: string) => {
    // Prefetch resource details for better UX
    utils.resources.byId.prefetch({ resourceId });
  }, [utils]);

  return {
    // Data
    resources: resources.data || [],
    resourceTypes: resourceTypes.data || [],
    resourceCategories: resourceCategories.data || { old: 0, new: 0, uncategorized: 0 },
    collectorTypes: collectorTypes.data || [],
    accountInfo: accountInfo.data,
    collectionJobs: collectionJobs.data || [],
    globalStats,

    // Loading states
    loading: {
      resources: resources.isLoading,
      resourceTypes: resourceTypes.isLoading,
      resourceCategories: resourceCategories.isLoading,
      collectorTypes: collectorTypes.isLoading,
      accountInfo: accountInfo.isLoading,
      collectionJobs: collectionJobs.isLoading,
      any: isLoadingAny,
    },

    // Error states
    errors: {
      resources: resources.error,
      resourceTypes: resourceTypes.error,
      resourceCategories: resourceCategories.error,
      collectorTypes: collectorTypes.error,
      accountInfo: accountInfo.error,
      collectionJobs: collectionJobs.error,
      any: hasError,
    },

    // Actions
    refreshAllData,
    invalidateResourceData,
    prefetchResourceDetails,

    // Utils for advanced usage
    utils,
  };
}

/**
 * Hook for real-time collection status
 */
export function useCollectionStatus() {
  const { collectionJobs } = useAppState();

  const activeJobs = useMemo(() =>
    collectionJobs.filter(job => job.status === 'running'),
    [collectionJobs]
  );

  const recentJobs = useMemo(() =>
    collectionJobs.slice(0, 5),
    [collectionJobs]
  );

  const isCollecting = activeJobs.length > 0;

  return {
    isCollecting,
    activeJobs,
    recentJobs,
    totalJobs: collectionJobs.length,
  };
}