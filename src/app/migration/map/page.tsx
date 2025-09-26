"use client";

import {
  BulkMappingActions,
  MappingColumn,
  MappingPanel,
} from "@/components/mapping";
import { MigrationNav } from "@/components/migration/MigrationNav";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMapping } from "@/hooks/use-mapping";
import type { MappingResource } from "@/hooks/use-mapping";
import { MAPPING_CONFIGS } from "@/lib/constants/mapping";
import React, { useState, useMemo, useEffect, useCallback } from "react";

export default function MappingPage() {
  const mapping = useMapping();
  const [selectedResource, setSelectedResource] =
    useState<MappingResource | null>(null);
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
  const handleResourceViewDetails = (resource: MappingResource) => {
    setSelectedResource(resource);
    mapping.setShowMappingDialog(true);
  };

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
      // Create mappings for each selected old resource to all selected new resources
      for (const oldResourceId of selectedOldResources) {
        const oldResource = oldResources.find(
          (r) => r.resourceId === oldResourceId,
        );
        await mapping.handleManyToManyResourceMap(
          oldResourceId,
          selectedNewResources,
          {
            mappingDirection: options?.mappingDirection || "old_to_new",
            mappingType: options?.mappingType || "replacement",
            notes:
              options?.notes ||
              `Mapping ${oldResource?.resourceName || oldResourceId} to ${selectedNewResources.length} target resources`,
          },
        );
      }

      // Clear selections
      setSelectedOldResources([]);
      setSelectedNewResources([]);
    } catch (error) {
      console.error("Failed to create mappings:", error);
    }
  };

  const handleClearSelection = () => {
    setSelectedOldResources([]);
    setSelectedNewResources([]);
  };

  const handleCreateMappingFromPanel = async (
    targetResourceId: string,
    notes?: string,
  ) => {
    if (selectedResource) {
      await mapping.handleResourceMap(
        selectedResource.resourceId,
        targetResourceId,
        notes,
      );
      mapping.setShowMappingDialog(false);
      setSelectedResource(null);
    }
  };

  const handleCloseMappingDialog = () => {
    mapping.setShowMappingDialog(false);
    setSelectedResource(null);
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
          onViewDetails={handleResourceViewDetails}
          onSelectAll={() => {
            if (filteredOldResources.length > 0) {
              setSelectedOldResources(
                filteredOldResources.map((r: MappingResource) => r.resourceId),
              );
            }
          }}
          onDeselectAll={() => setSelectedOldResources([])}
          selectedOldResources={selectedOldResources}
          onSelectOldResource={(resource: MappingResource) =>
            handleSelectOldResource(resource.resourceId)
          }
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
          onViewDetails={handleResourceViewDetails}
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
          selectedOldResources={selectedOldResources}
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
        loading={mapping.loading.mappings}
      />

      {/* Null Mapping Actions */}
      {selectedOldResources.length > 0 && selectedNewResources.length === 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedOldResources.length} old resource
              {selectedOldResources.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  selectedOldResources.forEach((resourceId) => {
                    mapping.handleMapToNothing(
                      resourceId,
                      "deprecation",
                      "Resource marked as deprecated",
                    );
                  });
                  setSelectedOldResources([]);
                }}
                className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md text-sm flex items-center gap-2"
                disabled={mapping.loading.mappings}
              >
                <span>⚠️</span>
                Mark as Deprecated
              </button>
              <button
                onClick={() => {
                  selectedOldResources.forEach((resourceId) => {
                    mapping.handleMapToNothing(
                      resourceId,
                      "removal",
                      "Resource marked for removal",
                    );
                  });
                  setSelectedOldResources([]);
                }}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm flex items-center gap-2"
                disabled={mapping.loading.mappings}
              >
                <span>🗑️</span>
                Mark for Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedNewResources.length > 0 && selectedOldResources.length === 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <div className="bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {selectedNewResources.length} new resource
              {selectedNewResources.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  mapping.handleMapFromNothing(
                    selectedNewResources,
                    `${selectedNewResources.length} resources marked as newly added`,
                  );
                  setSelectedNewResources([]);
                }}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm flex items-center gap-2"
                disabled={mapping.loading.mappings}
              >
                <span>➕</span>
                Mark as Newly Added
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Dialog */}
      <Dialog
        open={mapping.globalState.showMappingDialog}
        onOpenChange={handleCloseMappingDialog}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <MappingPanel
            resource={selectedResource}
            suggestedMappings={
              selectedResource
                ? mapping.suggestedMappings[selectedResource.resourceId] || []
                : []
            }
            onMap={handleCreateMappingFromPanel}
            onClose={handleCloseMappingDialog}
            loading={mapping.loading.mappings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
