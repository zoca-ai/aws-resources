import { AwsIcon } from "@/components/ui/aws-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { MappingResource } from "@/hooks/use-mapping";
import {
  formatAwsResourceType,
  getServiceCategory,
  getServiceCategoryColor,
} from "@/lib/aws-utils";
import { cn } from "@/lib/utils";
import type React from "react";

export interface ResourceMappingCardProps {
  resource: MappingResource;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMap: (resourceId: string, targetResourceId: string) => void;
  onUnmap: (resourceId: string) => void;
  suggestedMappings?: MappingResource[];
  onViewDetails: (resource: MappingResource) => void;
}
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Link,
  Link2Off,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";

const getMappingStatusConfig = (status: string) => {
  switch (status) {
    case "mapped":
      return { icon: Link, color: "primary", label: "Mapped" };
    case "pending":
      return { icon: Clock, color: "secondary", label: "Pending" };
    case "deprecated":
      return { icon: AlertTriangle, color: "destructive", label: "Deprecated" };
    case "removal":
      return { icon: Trash2, color: "destructive", label: "For Removal" };
    case "newly_added":
      return { icon: Plus, color: "success", label: "Newly Added" };
    default:
      return { icon: Link2Off, color: "destructive", label: "Unmapped" };
  }
};

export const ResourceMappingCard: React.FC<ResourceMappingCardProps> = ({
  resource,
  isSelected,
  onSelect,
  onUnmap,
  suggestedMappings = [],
  onViewDetails,
}) => {
  const statusConfig = getMappingStatusConfig(
    resource.mappingStatus || "unmapped",
  );
  const StatusIcon = statusConfig.icon;

  const getStatusStyling = (status: string) => {
    switch (status) {
      case "deprecated":
        return "border-yellow-300/50";
      case "removal":
        return "border-red-300/50";
      case "newly_added":
        return "border-green-300/50";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-4 transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/20"
          : "border-border hover:bg-accent/50 hover:shadow-sm",
        getStatusStyling(resource.mappingStatus || "unmapped"),
      )}
      onClick={() => onSelect(resource.resourceId)}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(resource.resourceId)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 transition-transform group-hover:scale-110"
        />

        <div className="min-w-0 flex-1">
          {/* Resource Header */}
          <div className="mb-2 flex items-center gap-2">
            <AwsIcon
              resourceType={resource.resourceType}
              size={20}
              className="flex-shrink-0"
              fallback="lucide"
            />
            <div
              className="font-medium break-all"
              title={resource.resourceName || resource.resourceId}
            >
              {resource.resourceName || resource.resourceId}
            </div>
            <div className="flex items-center gap-1">
              <StatusIcon
                className={cn("h-4 w-4", {
                  "text-green-600": statusConfig.color === "primary",
                  "text-red-600": statusConfig.color === "destructive",
                  "text-yellow-600": statusConfig.color === "secondary",
                })}
              />
              <Badge
                variant={
                  statusConfig.color === "primary"
                    ? "secondary"
                    : (statusConfig.color as "destructive" | "secondary")
                }
                className="text-xs"
              >
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Resource Info */}
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="font-mono text-xs">
              {formatAwsResourceType(resource.resourceType)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {resource.region}
            </Badge>
            {(() => {
              const category = getServiceCategory(resource.resourceType);
              const colors = getServiceCategoryColor(category);
              return (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    colors.text,
                    colors.bg,
                    colors.border,
                  )}
                >
                  {category}
                </Badge>
              );
            })()}
          </div>

          {/* Mapping Information */}
          {resource.mappingStatus === "mapped" &&
            resource.mappedToResourceName && (
              <div className="mb-2 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-2">
                <ArrowRight className="h-4 w-4 text-green-600" />
                <div className="min-w-0 flex-1">
                  <div
                    className="font-medium text-green-900 text-sm break-all"
                    title={resource.mappedToResourceName}
                  >
                    Mapped to:{" "}
                    {resource.mappedToResourceName &&
                    resource.mappedToResourceName.length > 35
                      ? `${resource.mappedToResourceName.substring(0, 35)}...`
                      : resource.mappedToResourceName}
                  </div>
                  {resource.mappingNotes && (
                    <div className="mt-1 text-green-700 text-xs">
                      {resource.mappingNotes}
                    </div>
                  )}
                  {resource.mappedAt && (
                    <div className="mt-1 text-green-600 text-xs">
                      Mapped on{" "}
                      {new Date(resource.mappedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Suggested Mappings */}
          {resource.mappingStatus === "unmapped" &&
            suggestedMappings.length > 0 && (
              <div className="mb-2 rounded-md border border-blue-200 bg-blue-50 p-2">
                <div className="mb-1 font-medium text-blue-900 text-sm">
                  Suggested Mappings ({suggestedMappings.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {suggestedMappings.slice(0, 3).map((suggestion) => (
                    <span
                      key={suggestion.resourceId}
                      className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-xs"
                      title={suggestion.resourceName || suggestion.resourceId}
                    >
                      {(suggestion.resourceName || suggestion.resourceId)
                        .length > 20
                        ? `${(suggestion.resourceName || suggestion.resourceId).substring(0, 20)}...`
                        : suggestion.resourceName || suggestion.resourceId}
                    </span>
                  ))}
                  {suggestedMappings.length > 3 && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-xs">
                      +{suggestedMappings.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

          {/* Resource Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 text-xs">
              {resource.tags.slice(0, 3).map((tag, idx) => {
                const tagText = `${tag.key}:${tag.value}`;
                return (
                  <span
                    key={`${tag.key}-${tag.value}-${idx}`}
                    className="inline-block rounded bg-muted px-2 py-1 text-muted-foreground break-all"
                    title={tagText}
                  >
                    {tagText.length > 15
                      ? `${tagText.substring(0, 15)}...`
                      : tagText}
                  </span>
                );
              })}
              {resource.tags.length > 3 && (
                <span className="rounded bg-muted px-2 py-1 text-muted-foreground">
                  +{resource.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
