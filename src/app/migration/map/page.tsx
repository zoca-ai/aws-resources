"use client";

import { BulkMappingActions, MappingColumn } from "@/components/mapping";
import { MigrationNav } from "@/components/migration/MigrationNav";
import { useMapping } from "@/hooks/use-mapping";
import type { MappingResource } from "@/hooks/use-mapping";
import { MAPPING_CONFIGS } from "@/lib/constants/mapping";
import React, { useState, useMemo, useEffect, useCallback } from "react";

export default function MappingPage() {
  const mapping = useMapping();
  const [selectedOldResources, setSelectedOldResources] = useState<string[]>(
    [],
  );
  const [selectedNewResources, setSelectedNewResources] = useState<string[]>(
    [],
  );

  // Set default filter to unmapped for mapping page
  useEffect(() => {
    mapping.updateFilter("mappingStatus", "unmapped");
  }, []);

  // Use mapping hook's filters for consistency with API calls
  const oldFilters = {
    search: mapping.filters.search,
    type: mapping.filters.type,
    region: mapping.filters.region,
    mappingStatus: mapping.filters.mappingStatus,
  };

  const newFilters = {
    search: mapping.filters.search,
    type: mapping.filters.type,
    region: mapping.filters.region,
    mappingStatus: mapping.filters.mappingStatus,
  };

  // Use server-side filtered resources directly from the mapping hook
  const filteredOldResources = mapping.categorizedResources.old || [];
  const filteredNewResources = mapping.categorizedResources.new || [];

  // Smart pagination - preload next pages based on user interaction patterns
  const smartPreload = useCallback(() => {
    // Only proceed if mapping functions are available
    if (
      !mapping.fetchNextPage ||
      !mapping.hasNextPage ||
      !mapping.isFetchingNextPage
    ) {
      return;
    }

    // Preload more old resources when user has selected any old resources
    if (
      selectedOldResources.length > 0 &&
      mapping.hasNextPage.old &&
      !mapping.isFetchingNextPage.old
    ) {
      mapping.fetchNextPage.old();
    }
    // Preload more new resources when user is actively searching
    if (
      mapping.filters.search &&
      mapping.hasNextPage.new &&
      !mapping.isFetchingNextPage.new
    ) {
      mapping.fetchNextPage.new();
    }
    // Preload when near the bottom of filtered results
    if (
      filteredOldResources.length > 30 &&
      mapping.hasNextPage.old &&
      !mapping.isFetchingNextPage.old
    ) {
      mapping.fetchNextPage.old();
    }
    if (
      filteredNewResources.length > 30 &&
      mapping.hasNextPage.new &&
      !mapping.isFetchingNextPage.new
    ) {
      mapping.fetchNextPage.new();
    }
  }, [
    selectedOldResources.length,
    mapping.filters.search,
    filteredOldResources.length,
    filteredNewResources.length,
    mapping.hasNextPage,
    mapping.isFetchingNextPage,
    mapping.fetchNextPage,
  ]);

  // Trigger smart preloading when user interactions suggest more data might be needed
  useEffect(() => {
    const timer = setTimeout(smartPreload, 800); // Debounce preloading
    return () => clearTimeout(timer);
  }, [smartPreload]);

  // Handlers

  const handleSelectOldResource = (resourceId: string) => {
    setSelectedOldResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId],
    );
    setSelectedNewResources([]); // Clear new resource selection when switching old resources
  };

  const handleSelectNewResource = (resourceId: string) => {
    setSelectedNewResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId],
    );
  };

  const handleCreateMapping = async (options?: {
    mappingDirection?: string;
    mappingType?: string;
    notes?: string;
  }) => {
    if (selectedOldResources.length === 0 || selectedNewResources.length === 0)
      return;

    try {
      // Handle different mapping scenarios
      if (selectedOldResources.length === 1) {
        // Single old resource to multiple new resources (1-to-many)
        const sourceResourceId = selectedOldResources[0];
        if (!sourceResourceId) return;

        await mapping.handleManyToManyResourceMap(
          sourceResourceId,
          selectedNewResources,
          {
            mappingDirection: options?.mappingDirection || "old_to_new",
            mappingType: options?.mappingType || "replacement",
            notes:
              options?.notes ||
              `Mapping 1 resource to ${selectedNewResources.length} target resources`,
          },
        );
      } else {
        // Multiple old resources to multiple new resources (many-to-many)
        // Use bulk API for better performance when dealing with many sources
        if (mapping.handleBulkManyToManyResourceMap) {
          await mapping.handleBulkManyToManyResourceMap(
            selectedOldResources,
            selectedNewResources,
            {
              mappingDirection: options?.mappingDirection || "old_to_new",
              mappingType: options?.mappingType || "replacement",
              notes:
                options?.notes ||
                `Bulk many-to-many mapping: ${selectedOldResources.length} sources to ${selectedNewResources.length} targets`,
            },
          );
        } else {
          // Fallback to individual mappings if bulk API is not available
          const mappingPromises = selectedOldResources.map(
            async (oldResourceId) => {
              const oldResource = filteredOldResources.find(
                (r) => r.resourceId === oldResourceId,
              );
              return mapping.handleManyToManyResourceMap(
                oldResourceId,
                selectedNewResources,
                {
                  mappingDirection: options?.mappingDirection || "old_to_new",
                  mappingType: options?.mappingType || "replacement",
                  notes:
                    options?.notes ||
                    `Many-to-many mapping: ${oldResource?.resourceName || oldResourceId} to ${selectedNewResources.length} target resources`,
                },
              );
            },
          );

          // Execute all mappings in parallel for better performance
          await Promise.all(mappingPromises);
        }
      }

    } catch (error) {
      console.error("Failed to create mappings:", error);
      throw error; // Re-throw so BulkMappingActions knows the operation failed
    }
  };

  const handleClearSelection = () => {
    setSelectedOldResources([]);
    setSelectedNewResources([]);
  };

  return (
    <div className="min-h-screen space-y-6">
      {/* Navigation */}
      <MigrationNav />

      {/* Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Old Resources Column */}
        <MappingColumn
          category="old"
          title="Legacy Resources"
          description="Select resources to map to new infrastructure"
          icon={
            MAPPING_CONFIGS.find((c) => c.key === "unmapped")?.icon ||
            (() => null)
          }
          count={filteredOldResources.length}
          color="destructive"
          isLoading={mapping.loading.resources || mapping.hasNextPage.old}
          searchTerm={oldFilters.search}
          onSearchChange={(value) => mapping.updateFilter("search", value)}
          typeFilter={oldFilters.type}
          onTypeFilterChange={(value) => mapping.updateFilter("type", value)}
          regionFilter={oldFilters.region}
          onRegionFilterChange={(value) => mapping.updateFilter("region", value)}
          mappingStatusFilter={oldFilters.mappingStatus}
          onMappingStatusFilterChange={(value) =>
            mapping.updateFilter("mappingStatus", value)
          }
          uniqueTypes={mapping.uniqueTypes}
          uniqueRegions={mapping.uniqueRegions}
          onClearFilters={() => {
            mapping.clearFilters();
            mapping.updateFilter("mappingStatus", "unmapped");
          }}
          resources={filteredOldResources}
          selectedResources={new Set(selectedOldResources)}
          onResourceSelect={handleSelectOldResource}
          onResourceMap={mapping.handleResourceMap}
          onResourceUnmap={mapping.handleResourceUnmap}
          suggestedMappings={mapping.suggestedMappings}
          onViewDetails={() => {}}
          onSelectAll={() => {
            if (filteredOldResources.length > 0) {
              setSelectedOldResources(
                filteredOldResources.map((r: MappingResource) => r.resourceId),
              );
            }
          }}
          onDeselectAll={() => setSelectedOldResources([])}
        />

        {/* New Resources Column */}
        <MappingColumn
          category="new"
          title="Modern Resources"
          description={
            selectedOldResources.length > 0
              ? `Select targets for ${selectedOldResources.length} selected resource${selectedOldResources.length > 1 ? "s" : ""}`
              : "Select old resources first to see mapping targets"
          }
          icon={
            MAPPING_CONFIGS.find((c) => c.key === "mapped")?.icon ||
            (() => null)
          }
          count={filteredNewResources.length}
          color="primary"
          isLoading={mapping.loading.resources || mapping.hasNextPage.new}
          searchTerm={newFilters.search}
          onSearchChange={(value) => mapping.updateFilter("search", value)}
          typeFilter={newFilters.type}
          onTypeFilterChange={(value) => mapping.updateFilter("type", value)}
          regionFilter={newFilters.region}
          onRegionFilterChange={(value) => mapping.updateFilter("region", value)}
          mappingStatusFilter={newFilters.mappingStatus}
          onMappingStatusFilterChange={(value) =>
            mapping.updateFilter("mappingStatus", value)
          }
          uniqueTypes={mapping.uniqueTypes}
          uniqueRegions={mapping.uniqueRegions}
          onClearFilters={() => {
            mapping.clearFilters();
            mapping.updateFilter("mappingStatus", "unmapped");
          }}
          resources={filteredNewResources}
          selectedResources={new Set(selectedNewResources)}
          onResourceSelect={handleSelectNewResource}
          onResourceMap={mapping.handleResourceMap}
          onResourceUnmap={mapping.handleResourceUnmap}
          suggestedMappings={mapping.suggestedMappings}
          onViewDetails={() => {}}
          onSelectAll={() => {
            if (
              selectedOldResources.length > 0 &&
              filteredNewResources.length > 0
            ) {
              setSelectedNewResources(
                filteredNewResources.map((r: MappingResource) => r.resourceId),
              );
            }
          }}
          onDeselectAll={() => setSelectedNewResources([])}
        />
      </div>

      {/* Bulk Mapping Actions */}
      <BulkMappingActions
        selectedOldResources={selectedOldResources}
        selectedNewResources={selectedNewResources}
        oldResources={filteredOldResources}
        newResources={filteredNewResources}
        onCreateMapping={handleCreateMapping}
        onClearSelection={handleClearSelection}
        onMapToNothing={async (resourceIds, mappingType, notes) => {
          await mapping.handleBulkMapToNothing(resourceIds, mappingType, notes);
        }}
        onMapFromNothing={async (resourceIds, notes) => {
          await mapping.handleMapFromNothing(resourceIds, notes);
        }}
        loading={mapping.loading.mappings}
      />
    </div>
  );
}
