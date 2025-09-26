import { AwsIcon } from "@/components/ui/aws-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatAwsResourceType,
  getServiceCategory,
  getServiceCategoryColor,
} from "@/lib/aws-utils";
import type { ResourceCardProps } from "@/lib/types/categorization";
import { cn } from "@/lib/utils";
import type React from "react";

const getCategoryButtonLabel = (targetCategory: string): string => {
  switch (targetCategory) {
    case "old":
      return "Mark Legacy";
    case "new":
      return "Mark Modern";
    case "uncategorized":
      return "Uncategorize";
    default:
      return "Categorize";
  }
};

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  isSelected,
  onSelect,
  category,
  onCategorize,
}) => {
  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/20"
          : "border-border hover:bg-accent/50 hover:shadow-sm",
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
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <AwsIcon
              resourceType={resource.resourceType}
              size={20}
              className="flex-shrink-0"
              fallback="lucide"
            />
            <div
              className="min-w-0 max-w-64 flex-1 truncate font-medium"
              title={resource.resourceName || resource.resourceId}
            >
              {resource.resourceName || resource.resourceId}
            </div>
          </div>

          {/* Resource Badges */}
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
            {resource.migrationCategory &&
              resource.migrationCategory !== "uncategorized" && (
                <Badge
                  variant={
                    resource.migrationCategory === "old"
                      ? "destructive"
                      : "default"
                  }
                  className="text-xs"
                >
                  {resource.migrationCategory}
                </Badge>
              )}
          </div>

          {/* Resource Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="mb-2 flex max-w-full flex-wrap gap-1 overflow-hidden text-xs">
              {resource.tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={`${tag.key}-${tag.value}-${idx}`}
                  className="w-24 truncate rounded bg-muted px-2 py-1 text-muted-foreground"
                  title={`${tag.key}:${tag.value}`}
                >
                  {tag.key}:{tag.value}
                </span>
              ))}
              {resource.tags.length > 2 && (
                <span
                  className="rounded bg-muted px-2 py-1 text-muted-foreground"
                  title={`${resource.tags.length - 2} more tags`}
                >
                  +{resource.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
