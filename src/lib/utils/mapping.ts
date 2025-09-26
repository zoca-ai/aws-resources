import {
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export interface MappingTypeConfig {
  icon: LucideIcon;
  color: string;
  badge: string;
  label: string;
}

export const getMappingTypeConfig = (mapping: any): MappingTypeConfig => {
  const hasTargets =
    mapping.targetResources && mapping.targetResources.length > 0;
  const isNewResource = mapping.sourceResources?.some((source: any) => source.resourceId === "NEW_RESOURCE");

  const notes = mapping.notes?.toLowerCase() || "";
  const isDeprecated =
    notes.includes("deprecat") || notes.includes("phase out");
  const isForRemoval =
    notes.includes("remov") ||
    notes.includes("delet") ||
    notes.includes("eliminate");
  const isNewlyAdded =
    isNewResource ||
    notes.includes("newly added") ||
    notes.includes("new resource");

  // First check for newly added resources (these can have targets)
  if (isNewlyAdded) {
    return {
      icon: Plus,
      color: "border-primary text-primary",
      badge: "border-primary text-primary",
      label: "Newly Added",
    };
  }

  // Then check if resource has targets - standard mappings
  if (hasTargets) {
    return {
      icon: ArrowRight,
      color: "",
      badge: "border-accent text-accent-foreground",
      label: "Standard",
    };
  }

  // Only check for special cases if there are NO targets
  if (isDeprecated) {
    return {
      icon: AlertTriangle,
      color: "border-border text-muted-foreground",
      badge: "border-border text-muted-foreground",
      label: "Deprecated",
    };
  }

  if (isForRemoval) {
    return {
      icon: Trash2,
      color: "border-destructive text-destructive",
      badge: "border-destructive text-destructive",
      label: "For Removal",
    };
  }

  // Default case for resources with no targets and no special classification
  return {
    icon: AlertTriangle,
    color: "border-border text-muted-foreground",
    badge: "border-border text-muted-foreground",
    label: "No Targets",
  };
};

export const formatMappingDirection = (direction: string): string => {
  switch (direction) {
    case "old_to_new":
      return "Legacy → Modern";
    case "new_to_old":
      return "Modern → Legacy";
    case "old_to_old":
      return "Legacy → Legacy";
    case "new_to_new":
      return "Modern → Modern";
    case "any_to_any":
      return "Flexible";
    default:
      return direction;
  }
};

export const applyMappingFilters = (
  mappings: any[],
  filters: {
    search: string;
    mappingTypeFilter: string;
    resourceTypeFilter: string;
    regionFilter: string;
  },
) => {
  if (!mappings.length) return [];

  const searchLower = filters.search.toLowerCase();

  return mappings.filter((mapping: any) => {
    // Search filter
    if (filters.search) {
      const matchesSearch =
        mapping.notes?.toLowerCase().includes(searchLower) ||
        mapping.sourceResources?.some((source: any) =>
          source.resourceName?.toLowerCase().includes(searchLower) ||
          source.resourceId?.toLowerCase().includes(searchLower) ||
          source.resourceType?.toLowerCase().includes(searchLower)
        ) ||
        mapping.targetResources?.some((target: any) =>
          target.resourceName?.toLowerCase().includes(searchLower) ||
          target.resourceId?.toLowerCase().includes(searchLower) ||
          target.resourceType?.toLowerCase().includes(searchLower)
        );

      if (!matchesSearch) {
        return false;
      }
    }

    // Mapping type filter
    if (filters.mappingTypeFilter && filters.mappingTypeFilter !== "all") {
      const typeConfig = getMappingTypeConfig(mapping);
      const filterMatches =
        (filters.mappingTypeFilter === "deprecation" &&
          typeConfig.label === "Deprecated") ||
        (filters.mappingTypeFilter === "removal" &&
          typeConfig.label === "For Removal") ||
        (filters.mappingTypeFilter === "addition" &&
          typeConfig.label === "Newly Added") ||
        (filters.mappingTypeFilter === "replacement" &&
          typeConfig.label === "Standard");
      if (!filterMatches) {
        return false;
      }
    }

    // Resource type filter
    if (filters.resourceTypeFilter && filters.resourceTypeFilter !== "all") {
      const hasMatchingResourceType = mapping.sourceResources?.some((source: any) =>
        source.resourceType === filters.resourceTypeFilter
      );
      if (!hasMatchingResourceType) {
        return false;
      }
    }

    // Region filter
    if (filters.regionFilter && filters.regionFilter !== "all") {
      const hasMatchingRegion = mapping.sourceResources?.some((source: any) =>
        source.region === filters.regionFilter
      );
      if (!hasMatchingRegion) {
        return false;
      }
    }

    return true;
  });
};

