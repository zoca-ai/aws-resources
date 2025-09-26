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

  // Separate filters for each column
  const [oldFilters, setOldFilters] = useState({
    search: "",
    type: "all",
    region: "all",
    mappingStatus: "unmapped", // Default to unmapped only for mapping page
  });
  const [newFilters, setNewFilters] = useState({
    search: "",
    type: "all",
    region: "all",
    mappingStatus: "unmapped", // Default to unmapped only for mapping page
  });

  // Get categorized resources from the hook
  const { oldResources, newResources } = useMemo(
    () => ({
      oldResources: mapping.categorizedResources.old || [],
      newResources: mapping.categorizedResources.new || [],
    }),
    [mapping.categorizedResources],
  );

  // Filter resources for each column
  const filteredOldResources = useMemo(() => {
    return oldResources.filter((resource: MappingResource) => {
      const matchesSearch =
        !oldFilters.search ||
        resource.resourceName
          ?.toLowerCase()
          .includes(oldFilters.search.toLowerCase()) ||
        resource.resourceId
          .toLowerCase()
          .includes(oldFilters.search.toLowerCase());
      const matchesType =
        oldFilters.type === "all" || resource.resourceType === oldFilters.type;
      const matchesRegion =
        oldFilters.region === "all" || resource.region === oldFilters.region;
      const matchesMappingStatus =
        oldFilters.mappingStatus === "all" ||
        (oldFilters.mappingStatus === "unmapped" &&
          (!resource.mappingStatus || resource.mappingStatus === "unmapped")) ||
        (oldFilters.mappingStatus === "mapped" &&
          resource.mappingStatus === "mapped");

      return (
        matchesSearch && matchesType && matchesRegion && matchesMappingStatus
      );
    });
  }, [oldResources, oldFilters]);

  const filteredNewResources = useMemo(() => {
    const filtered = newResources.filter((resource: MappingResource) => {
      const matchesSearch =
        !newFilters.search ||
        resource.resourceName
          ?.toLowerCase()
          .includes(newFilters.search.toLowerCase()) ||
        resource.resourceId
          .toLowerCase()
          .includes(newFilters.search.toLowerCase());
      const matchesType =
        newFilters.type === "all" || resource.resourceType === newFilters.type;
      const matchesRegion =
        newFilters.region === "all" || resource.region === newFilters.region;
      const matchesMappingStatus =
        newFilters.mappingStatus === "all" ||
        (newFilters.mappingStatus === "unmapped" &&
          (!resource.mappingStatus || resource.mappingStatus === "unmapped")) ||
        (newFilters.mappingStatus === "mapped" &&
          resource.mappingStatus === "mapped");

      return (
        matchesSearch && matchesType && matchesRegion && matchesMappingStatus
      );
    });

    // If we have selected old resources, optionally filter by same type for easier mapping
    if (selectedOldResources.length > 0) {
      // For now, show all new resources, but we could add a toggle for same-type only
    }

    return filtered;
  }, [newResources, newFilters, selectedOldResources]);

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
    // Preload more new resources when user is actively searching in new column
    if (
      newFilters.search &&
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
    newFilters.search,
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
              const oldResource = oldResources.find(
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
          searchTerm={oldFilters.search}
          onSearchChange={(value) =>
            setOldFilters((prev) => ({ ...prev, search: value }))
          }
          typeFilter={oldFilters.type}
          onTypeFilterChange={(value) =>
            setOldFilters((prev) => ({ ...prev, type: value }))
          }
          regionFilter={oldFilters.region}
          onRegionFilterChange={(value) =>
            setOldFilters((prev) => ({ ...prev, region: value }))
          }
          mappingStatusFilter={oldFilters.mappingStatus}
          onMappingStatusFilterChange={(value) =>
            setOldFilters((prev) => ({ ...prev, mappingStatus: value }))
          }
          uniqueTypes={mapping.uniqueTypes}
          uniqueRegions={mapping.uniqueRegions}
          onClearFilters={() =>
            setOldFilters({
              search: "",
              type: "all",
              region: "all",
              mappingStatus: "unmapped",
            })
          }
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
          searchTerm={newFilters.search}
          onSearchChange={(value) =>
            setNewFilters((prev) => ({ ...prev, search: value }))
          }
          typeFilter={newFilters.type}
          onTypeFilterChange={(value) =>
            setNewFilters((prev) => ({ ...prev, type: value }))
          }
          regionFilter={newFilters.region}
          onRegionFilterChange={(value) =>
            setNewFilters((prev) => ({ ...prev, region: value }))
          }
          mappingStatusFilter={newFilters.mappingStatus}
          onMappingStatusFilterChange={(value) =>
            setNewFilters((prev) => ({ ...prev, mappingStatus: value }))
          }
          uniqueTypes={mapping.uniqueTypes}
          uniqueRegions={mapping.uniqueRegions}
          onClearFilters={() =>
            setNewFilters({
              search: "",
              type: "all",
              region: "all",
              mappingStatus: "unmapped",
            })
          }
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
