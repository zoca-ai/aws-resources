"use client";

import { Badge } from "@/components/ui/badge";
import { AwsIcon } from "@/components/ui/aws-icon";
import { formatAwsResourceType } from "@/lib/aws-utils";

interface ResourceDisplayProps {
  resources: any[];
  maxVisible?: number;
  emptyStateMessage?: string;
  emptyStateIcon?: React.ComponentType<{ className?: string }>;
  layout?: "grid" | "list";
}

export function ResourceDisplay({
  resources,
  maxVisible = 5,
  emptyStateMessage = "No resources",
  emptyStateIcon: EmptyIcon,
  layout = "grid",
}: ResourceDisplayProps) {
  if (!resources || resources.length === 0) {
    return (
      <div className="text-muted-foreground text-sm flex items-center gap-2">
        {EmptyIcon && <EmptyIcon className="h-4 w-4" />}
        {emptyStateMessage}
      </div>
    );
  }

  const visibleResources = resources.slice(0, maxVisible);
  const remainingCount = resources.length - maxVisible;

  return (
    <div className={`space-y-2 ${layout === "grid" ? "grid grid-cols-3" : ""}`}>
      {visibleResources.map((resource, idx) => (
        <ResourceItem key={idx} resource={resource} />
      ))}
      {remainingCount > 0 && (
        <div className="text-muted-foreground text-xs pl-8 py-1">
          +{remainingCount} more resources
        </div>
      )}
    </div>
  );
}

interface ResourceItemProps {
  resource: any;
}

function ResourceItem({ resource }: ResourceItemProps) {
  return (
    <div className="flex items-start gap-3 min-w-0 py-2">
      <AwsIcon
        resourceType={resource.resourceType || "unknown"}
        size={40}
        className="flex-shrink-0 mt-0.5"
        fallback="lucide"
      />
      <div className="min-w-0 flex-1">
        <div
          className="font-medium text-sm leading-5 break-all"
          title={resource.resourceId}
        >
          {resource.resourceName || resource.resourceId || "Unknown Resource"}
        </div>
        <div className="mt-1 space-y-1">
          <Badge variant="outline" className="text-xs">
            {formatAwsResourceType(resource.resourceType || "unknown")}
          </Badge>
        </div>
      </div>
    </div>
  );
}
