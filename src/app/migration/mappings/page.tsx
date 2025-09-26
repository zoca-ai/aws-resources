"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VirtualScroll } from "@/components/ui/virtual-scroll";
import { MappingListSkeleton } from "@/components/mapping/MappingSkeleton";
import { MappingCard } from "@/components/mapping/MappingCard";
import { MappingNotesDialog } from "@/components/mapping/MappingNotesDialog";
import { api } from "@/trpc/react";
import React, { useState, useMemo, useEffect } from "react";
import { applyMappingFilters } from "@/lib/utils/mapping";
import { useMappingOperations } from "@/hooks/useMappingOperations";

// Type for migration mapping from tRPC
import { BarChart3, Search } from "lucide-react";
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
  // Use infinite query for better performance with large datasets
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.migration.mappingsInfinite.useInfiniteQuery(
    { limit: 50 }, // Smaller chunks for better infinite scroll performance
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

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
  } = useMappingOperations();

  // Flatten mappings from all pages
  const mappings = useMemo(() => {
    return mappingsData?.pages.flatMap((page) => page.mappings) || [];
  }, [mappingsData]);

  // Filters and search
  const [search, setSearch] = useState("");
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [containerHeight, setContainerHeight] = useState(600); // Default height

  // Calculate container height on mount and resize
  useEffect(() => {
    const calculateHeight = () => {
      const height = window.innerHeight - 300; // Account for header, nav, filters
      setContainerHeight(Math.max(400, height)); // Minimum 400px
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, []);

  // Apply filters using extracted utility
  const filteredMappings = useMemo(() => {
    return applyMappingFilters(mappings, {
      search,
      mappingTypeFilter,
      resourceTypeFilter,
      regionFilter,
    });
  }, [mappings, search, mappingTypeFilter, resourceTypeFilter, regionFilter]);

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
      <Card className="mx-6 mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Search Bar */}
            <div className="relative max-w-sm flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
              <Input
                placeholder="Search mappings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 lg:flex-nowrap">
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
                  <SelectItem value="deprecation">Deprecated</SelectItem>
                  <SelectItem value="removal">For Removal</SelectItem>
                  <SelectItem value="addition">Newly Added</SelectItem>
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
            </div>
          </div>

          <div className="flex items-center justify-between text-gray-600 text-sm">
            <div>
              {mappingsLoading
                ? "Loading mappings..."
                : `Showing ${filteredMappings.length} of ${mappings.length} mappings`}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setMappingTypeFilter("all");
                setResourceTypeFilter("all");
                setRegionFilter("all");
                setDateFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mappings List with Virtual Scrolling */}
      <div className="flex-1 mx-6 mt-6 mb-6">
        <Card className="h-full">
          <CardContent className="pt-6 h-full">
            {mappingsLoading && mappings.length === 0 ? (
              <MappingListSkeleton count={10} />
            ) : filteredMappings.length > 0 ? (
              <VirtualScroll
                items={filteredMappings}
                itemHeight={150}
                containerHeight={containerHeight}
                renderItem={(mapping, index) => (
                  <MappingCard
                    key={mapping.id || `mapping-${index}`}
                    mapping={mapping as any}
                    onEditNotes={handleEditNotes}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteMapping}
                    isDeleting={deleteMapping.isPending}
                  />
                )}
                onLoadMore={() => {
                  if (hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                }}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            ) : (
              <div className="py-12 text-center text-gray-500">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
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
