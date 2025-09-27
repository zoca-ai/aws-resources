import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MappingResource } from "@/hooks/use-mapping";
import { SCROLL_AREA_HEIGHT } from "@/lib/constants/mapping";
import { cn } from "@/lib/utils";
import type React from "react";
import { MappingColumnFilters } from "./ColumnFilters";
import { ResourceMappingCard } from "./ResourceMappingCard";

interface MappingColumnProps {
  category: "old" | "new";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  color?: "primary" | "destructive" | "secondary";
  isLoading?: boolean;

  // Filter props
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  regionFilter: string;
  onRegionFilterChange: (value: string) => void;
  mappingStatusFilter: string;
  onMappingStatusFilterChange: (value: string) => void;
  uniqueTypes: string[];
  uniqueRegions: string[];
  onClearFilters: () => void;

  // Resource props
  resources: MappingResource[];
  selectedResources: Set<string>;
  onResourceSelect: (id: string) => void;
  onResourceMap: (resourceId: string, targetResourceId: string) => void;
  onResourceUnmap: (resourceId: string) => void;
  suggestedMappings: Record<string, MappingResource[]>;
  onViewDetails: (resource: MappingResource) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;

  // For mapping between columns
  selectedOldResource?: MappingResource | null;
  selectedOldResources?: string[];
  onSelectOldResource?: (resource: MappingResource) => void;
}

export const MappingColumn: React.FC<MappingColumnProps> = ({
  category,
  title,
  icon: Icon,
  count,
  isLoading = false,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  regionFilter,
  onRegionFilterChange,
  mappingStatusFilter,
  onMappingStatusFilterChange,
  uniqueTypes,
  uniqueRegions,
  onClearFilters,
  resources,
  selectedResources,
  onResourceSelect,
  onResourceMap,
  onResourceUnmap,
  suggestedMappings,
  onViewDetails,
  onSelectAll,
  onDeselectAll,
  selectedOldResource,
  onSelectOldResource,
}) => {
  const hasFilters =
    searchTerm !== "" || typeFilter !== "all" || regionFilter !== "all" || mappingStatusFilter !== "unmapped";
  const placeholder = `Search ${title.toLowerCase()}...`;

  return (
    <Card className={cn("transition-all duration-200")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            <Badge variant="outline" className="ml-2">
              {isLoading ? "Loading..." : count}
            </Badge>
          </CardTitle>
          {selectedOldResource && category === "new" && (
            <Badge variant="secondary" className="text-xs">
              Mapping Mode
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <MappingColumnFilters
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange}
          regionFilter={regionFilter}
          onRegionFilterChange={onRegionFilterChange}
          mappingStatusFilter={mappingStatusFilter}
          onMappingStatusFilterChange={onMappingStatusFilterChange}
          uniqueTypes={uniqueTypes}
          uniqueRegions={uniqueRegions}
          onClearFilters={onClearFilters}
          placeholder={placeholder}
        />

        <div className="p-3">
          {/* Selection Controls */}
          {resources.length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-7 text-xs"
                disabled={category === "new" && !selectedOldResource}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeselectAll}
                className="h-7 text-xs"
              >
                Deselect
              </Button>
            </div>
          )}

          {/* Resource List */}
          <ScrollArea style={{ height: SCROLL_AREA_HEIGHT }}>
            <div className="space-y-3">
              {category === "old"
                ? // Old resources - clickable for selection
                  resources.map((resource) => (
                    <div
                      key={resource.resourceId}
                      onClick={() => onSelectOldResource?.(resource)}
                    >
                      <ResourceMappingCard
                        resource={resource}
                        isSelected={selectedResources.has(resource.resourceId)}
                        onSelect={onResourceSelect}
                        onMap={onResourceMap}
                        onUnmap={onResourceUnmap}
                        suggestedMappings={
                          suggestedMappings[resource.resourceId] || []
                        }
                        onViewDetails={onViewDetails}
                      />
                    </div>
                  ))
                : // New resources - normal display
                  resources.map((resource) => (
                    <ResourceMappingCard
                      key={resource.resourceId}
                      resource={resource}
                      isSelected={selectedResources.has(resource.resourceId)}
                      onSelect={onResourceSelect}
                      onMap={onResourceMap}
                      onUnmap={onResourceUnmap}
                      suggestedMappings={
                        suggestedMappings[resource.resourceId] || []
                      }
                      onViewDetails={onViewDetails}
                    />
                  ))}

              {/* Empty State */}
              {resources.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  {category === "new" && !selectedOldResource ? (
                    <>
                      <Icon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>Select an old resource first</p>
                      <p className="mt-1 text-xs">
                        Choose a resource from the left column to see available
                        mappings
                      </p>
                    </>
                  ) : hasFilters ? (
                    <>
                      <Icon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>No resources match your filters</p>
                      <p className="mt-1 text-xs">
                        Try adjusting your search criteria
                      </p>
                    </>
                  ) : (
                    <>
                      <Icon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <p>No {category} resources found</p>
                      <p className="mt-1 text-xs">
                        {category === "old"
                          ? "No legacy resources to map"
                          : "No modern resources available"}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
