import {
  AlertTriangle,
  ArrowRight,
  Plus,
  Trash2,
  Hand,
  GitBranch,
  Shuffle,
  Merge,
  Split,
  FileText,
  Clock,
  Timer,
  type LucideIcon,
} from "lucide-react";

export interface MappingTypeConfig {
  icon: LucideIcon;
  color: string;
  badge: string;
  label: string;
}

export const getMappingTypeConfig = (mapping: any): MappingTypeConfig => {
  const category = mapping.category || "undecided";

  switch (category) {
    case "replacement":
      return {
        icon: Shuffle,
        color: "border-blue-300 text-blue-700",
        badge: "border-blue-300 text-blue-700",
        label: "Replacement",
      };
    case "consolidation":
      return {
        icon: Merge,
        color: "border-green-300 text-green-700",
        badge: "border-green-300 text-green-700",
        label: "Consolidation",
      };
    case "split":
      return {
        icon: Split,
        color: "border-purple-300 text-purple-700",
        badge: "border-purple-300 text-purple-700",
        label: "Split",
      };
    case "dependency":
      return {
        icon: GitBranch,
        color: "border-indigo-300 text-indigo-700",
        badge: "border-indigo-300 text-indigo-700",
        label: "Dependency",
      };
    case "keep_manual":
      return {
        icon: Hand,
        color: "border-orange-300 text-orange-700",
        badge: "border-orange-300 text-orange-700",
        label: "Keep Manual",
      };
    case "migrate_terraform":
      return {
        icon: GitBranch,
        color: "border-teal-300 text-teal-700",
        badge: "border-teal-300 text-teal-700",
        label: "Migrate to Terraform",
      };
    case "to_be_removed":
      return {
        icon: Trash2,
        color: "border-destructive text-destructive",
        badge: "border-destructive text-destructive",
        label: "To Be Removed",
      };
    case "deprecated":
      return {
        icon: AlertTriangle,
        color: "border-yellow-300 text-yellow-700",
        badge: "border-yellow-300 text-yellow-700",
        label: "Deprecated",
      };
    case "staging":
      return {
        icon: Clock,
        color: "border-cyan-300 text-cyan-700",
        badge: "border-cyan-300 text-cyan-700",
        label: "Staging",
      };
    case "chrone":
      return {
        icon: Timer,
        color: "border-pink-300 text-pink-700",
        badge: "border-pink-300 text-pink-700",
        label: "Chrone",
      };
    case "undecided":
    default:
      return {
        icon: FileText,
        color: "border-gray-300 text-gray-700",
        badge: "border-gray-300 text-gray-700",
        label: "Undecided",
      };
  }
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
      const mappingCategory = mapping.category || "undecided";
      if (mappingCategory !== filters.mappingTypeFilter) {
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

