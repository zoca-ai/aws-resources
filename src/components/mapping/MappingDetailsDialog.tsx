"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AwsIcon } from "@/components/ui/aws-icon";
import {
  getMappingTypeConfig,
  formatMappingDirection,
} from "@/lib/utils/mapping";
import type { MigrationMapping } from "@/lib/types/mapping";
import { Eye, Copy } from "lucide-react";

interface MappingDetailsDialogProps {
  mapping: MigrationMapping;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MappingDetailsDialog({
  mapping,
  open,
  onOpenChange,
}: MappingDetailsDialogProps) {
  const typeConfig = getMappingTypeConfig(mapping);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderResourceSection = (
    resources: any[] | undefined,
    title: string,
    bgClass: string = "bg-background/30",
  ): React.ReactNode => {
    const resourceArray = resources as any[];
    if (!resourceArray || resourceArray.length === 0) {
      return <div />;
    }

    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="font-semibold text-sm mb-3">
          {title} ({resourceArray.length})
        </h3>
        <div className="space-y-3">
          {resourceArray.map((resource: any, idx: number) => (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 ${bgClass} rounded-lg border`}
            >
              <AwsIcon
                resourceType={resource.resourceType || "unknown"}
                size={32}
                className="flex-shrink-0 mt-0.5"
                fallback="lucide"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {resource.resourceName || resource.resourceId}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(resource.resourceId || "")}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">ID:</span>{" "}
                    {resource.resourceId}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span>{" "}
                    {resource.resourceType}
                  </div>
                  <div>
                    <span className="font-medium">Region:</span>{" "}
                    {resource.region || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Account:</span>{" "}
                    {resource.awsAccountId || "N/A"}
                  </div>
                  {resource.resourceArn && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">ARN:</span>
                      <span className="font-mono break-all">
                        {resource.resourceArn}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(resource.resourceArn || "")
                        }
                        className="h-4 w-4 p-0"
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Mapping Details
          </DialogTitle>
          <DialogDescription>
            Complete information for this migration mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mapping Metadata */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="font-semibold text-sm mb-3">Mapping Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Mapping ID:</span>
                  <span className="font-mono bg-background px-2 py-1 rounded border">
                    {mapping.id}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(mapping.id?.toString() || "")
                    }
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Group ID:</span>
                  <span className="font-mono bg-background px-2 py-1 rounded border text-xs">
                    {mapping.mappingGroupId || "N/A"}
                  </span>
                  {mapping.mappingGroupId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(mapping.mappingGroupId || "")
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <Badge className={`ml-2 ${typeConfig.badge}`}>
                    {typeConfig.label}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Direction:</span>
                  <span className="ml-2">
                    {formatMappingDirection(
                      mapping.mappingDirection || "old_to_new",
                    )}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant="outline" className="ml-2">
                    {mapping.migrationStatus || "not_started"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Priority:</span>
                  <Badge variant="outline" className="ml-2">
                    {mapping.priority || "medium"}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-muted-foreground">
                    {mapping.createdAt
                      ? new Date(mapping.createdAt).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Updated:</span>
                  <span className="ml-2 text-muted-foreground">
                    {mapping.updatedAt
                      ? new Date(mapping.updatedAt).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {renderResourceSection(
            mapping.sourceResources,
            "Source Resources",
            "bg-background/30",
          )}

          {renderResourceSection(
            mapping.targetResources,
            "Target Resources",
            "bg-background",
          )}

          {mapping.notes && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">Notes</h3>
              <div className="bg-background/10 p-3 rounded-lg border text-sm">
                {mapping.notes}
              </div>
            </div>
          )}

          {(mapping.mappingDescription as any) && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">Description</h3>
              <div className="bg-background/20 p-3 rounded-lg border text-sm">
                {mapping.mappingDescription}
              </div>
            </div>
          )}

          {mapping.history && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">History</h3>
              <div className="bg-background/20 p-3 rounded-lg border">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {typeof mapping.history === "string"
                    ? mapping.history
                    : JSON.stringify(mapping.history, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
