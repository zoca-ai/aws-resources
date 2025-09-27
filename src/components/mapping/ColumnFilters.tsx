import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatResourceType } from "@/lib/format-utils";
import { api } from "@/trpc/react";
import { RotateCcw, Search } from "lucide-react";
import React, { useMemo } from "react";

interface MappingColumnFiltersProps {
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
  placeholder?: string;
  disabled?: boolean;
}

export const MappingColumnFilters: React.FC<MappingColumnFiltersProps> = ({
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
  placeholder = "Search resources...",
  disabled = false,
}) => {
  const hasActiveFilters =
    searchTerm !== "" ||
    typeFilter !== "all" ||
    regionFilter !== "all" ||
    mappingStatusFilter !== "all";

  const { data: resourceTypesData } = api.resources.types.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - types don't change often
    refetchOnWindowFocus: false,
  });

  const { data: regionsData } = api.resources.regions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - regions don't change often
    refetchOnWindowFocus: false,
  });

  // Get filter options from API data
  const filterOptions = useMemo(() => {
    return {
      resourceTypes:
        resourceTypesData?.map((item) => item.type).filter(Boolean) ?? [],
      regions: regionsData?.map((item) => item.region).filter(Boolean) ?? [],
    };
  }, [resourceTypesData, regionsData]);

  return (
    <div className="space-y-3 border-b p-3 ">
      {/* Search */}
      <div className="relative">
        <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-8"
          disabled={disabled}
        />
      </div>

      {/* Filters Row */}
      <div className="flex gap-2">
        <Select
          value={mappingStatusFilter}
          onValueChange={onMappingStatusFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            <SelectItem value="unmapped">Unmapped Only</SelectItem>
            <SelectItem value="mapped">Mapped Only</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {filterOptions.resourceTypes.map((type) => (
              <SelectItem key={type} value={type} className="text-xs">
                {formatResourceType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={regionFilter}
          onValueChange={onRegionFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {filterOptions.regions.map((region) => (
              <SelectItem key={region} value={region} className="text-xs">
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 px-2"
            disabled={disabled}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {searchTerm && (
            <Badge variant="secondary" className="text-xs">
              Search: {searchTerm}
            </Badge>
          )}
          {mappingStatusFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Status:{" "}
              {mappingStatusFilter === "unmapped"
                ? "Unmapped Only"
                : "Mapped Only"}
            </Badge>
          )}
          {typeFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Type: {formatResourceType(typeFilter)}
            </Badge>
          )}
          {regionFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Region: {regionFilter}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
