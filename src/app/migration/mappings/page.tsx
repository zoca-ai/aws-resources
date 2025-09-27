"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MappingListSkeleton } from "@/components/mapping/MappingSkeleton";
import { MappingCard } from "@/components/mapping/MappingCard";
import { MappingNotesDialog } from "@/components/mapping/MappingNotesDialog";
import { api } from "@/trpc/react";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useMappingOperations } from "@/hooks/useMappingOperations";

// Type for migration mapping from tRPC
import { BarChart3, Search, Trash } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MigrationNav } from "@/components/migration/MigrationNav";

export default function MappingsListPage() {
  // Filters and search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [search]);

  // Use infinite query for better performance with large datasets with server-side filtering
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.migration.mappingsInfinite.useInfiniteQuery(
    {
      limit: 50,
      search: debouncedSearch || undefined,
      category: mappingTypeFilter !== "all" ? mappingTypeFilter : undefined,
      resourceType:
        resourceTypeFilter !== "all" ? resourceTypeFilter : undefined,
      region: regionFilter !== "all" ? regionFilter : undefined,
      dateFilter: dateFilter !== "all" ? dateFilter : undefined,
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  // Auto-fetch next page when available
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      const timer = setTimeout(() => {
        fetchNextPage();
      }, 300); // Small delay to prevent overwhelming the server

      return () => clearTimeout(timer);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get filter options with caching
  const { data: resourceTypesData } = api.resources.types.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - types don't change often
    refetchOnWindowFocus: false,
  });

  const { data: regionsData } = api.resources.regions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - regions don't change often
    refetchOnWindowFocus: false,
  });

  // Extract mapping operations to custom hook
  const {
    editingMapping,
    editingNotes,
    setEditingNotes,
    updateMapping,
    deleteMapping,
    handleDeleteMapping,
    handleEditNotes,
    handleSaveNotes,
    handleCancelEdit,
    handleUpdateStatus,
    handleUpdateMappingType,
  } = useMappingOperations();

  // Flatten mappings from all pages - no client-side filtering needed since it's done on server
  const filteredMappings = useMemo(() => {
    return mappingsData?.pages.flatMap((page) => page.mappings) || [];
  }, [mappingsData]);

  // Statistics

  // Get filter options from API data
  const filterOptions = useMemo(() => {
    return {
      resourceTypes:
        resourceTypesData?.map((item) => item.type).filter(Boolean) ?? [],
      regions: regionsData?.map((item) => item.region).filter(Boolean) ?? [],
    };
  }, [resourceTypesData, regionsData]);

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <MigrationNav />

      {/* Filters and Actions */}
      <Card className="mt-6 relative overflow-hidden">
        {/* Shimmer background when loading */}
        {(mappingsLoading || hasNextPage) && (
          <div className="absolute inset-0 shimmer-bg -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
        )}

        <CardContent className="relative">
          {/* Header with title and loading status */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Migration Mappings</h3>
              <div className="text-sm text-muted-foreground">
                {mappingsLoading && hasNextPage
                  ? `Loading mappings... (${filteredMappings.length} loaded so far)`
                  : mappingsLoading
                    ? "Loading mappings..."
                    : hasNextPage
                      ? `${filteredMappings.length} mappings loaded, loading more...`
                      : `Showing ${filteredMappings.length} mappings`}
              </div>
            </div>

            {/* Loading indicator */}
            {(mappingsLoading || hasNextPage) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {hasNextPage ? "Auto-loading..." : "Loading..."}
              </div>
            )}
          </div>

          {/* Search and Filters */}
          <div className="space-y-4 w-full ">
            {/* Primary Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mappings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-3 w-full">
              <Select
                value={mappingTypeFilter}
                onValueChange={setMappingTypeFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="replacement">Replacement</SelectItem>
                  <SelectItem value="consolidation">Consolidation</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="dependency">Dependency</SelectItem>
                  <SelectItem value="keep_manual">Keep Manual</SelectItem>
                  <SelectItem value="migrate_terraform">
                    Migrate to Terraform
                  </SelectItem>
                  <SelectItem value="to_be_removed">To Be Removed</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="undecided">Undecided</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="chrone">Chrone</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={resourceTypeFilter}
                onValueChange={setResourceTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Resource Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource Types</SelectItem>
                  {filterOptions.resourceTypes.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {filterOptions.regions.map((region: string) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setMappingTypeFilter("all");
                    setResourceTypeFilter("all");
                    setRegionFilter("all");
                    setDateFilter("all");
                  }}
                  className="h-10"
                >
                  <Trash />
                  <span>Clear All</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mappings List */}
      <div className="flex-1 mt-6 mb-6 overflow-hidden">
        <Card className="h-full">
          <CardContent className="pt-6 h-full">
            {mappingsLoading && filteredMappings.length === 0 ? (
              <MappingListSkeleton count={10} />
            ) : filteredMappings.length > 0 ? (
              <div className="h-full overflow-y-auto space-y-4">
                {filteredMappings.map((mapping, index) => (
                  <MappingCard
                    key={mapping.id || `mapping-${index}`}
                    mapping={mapping as any}
                    onEditNotes={handleEditNotes}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateMappingType={handleUpdateMappingType}
                    onDelete={handleDeleteMapping}
                    isDeleting={deleteMapping.isPending}
                  />
                ))}
                {hasNextPage && (
                  <div className="flex justify-center py-4">
                    <Button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      variant="outline"
                    >
                      {isFetchingNextPage ? "Loading..." : "Load More"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center ">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 " />
                <div className="mb-2 font-medium text-lg">
                  No mappings found
                </div>
                <p>No mappings match your current filters.</p>
                <Link href="/migration/map" className="mt-4 inline-block">
                  <Button>Create First Mapping</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Editing Dialog */}
      <MappingNotesDialog
        editingMapping={editingMapping}
        editingNotes={editingNotes}
        setEditingNotes={setEditingNotes}
        onSave={handleSaveNotes}
        onCancel={handleCancelEdit}
        isUpdating={updateMapping.isPending}
      />
    </div>
  );
}
