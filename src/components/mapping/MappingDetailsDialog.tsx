"use client";

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
import { formatAwsResourceType } from "@/lib/aws-utils";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
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
            <h3 className="font-semibold text-sm mb-3">
              Mapping Information
            </h3>
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

          {/* Source Resources */}
          {(mapping.sourceResources as any)?.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">
                Source Resources (
                {(mapping.sourceResources as any)?.length || 0})
              </h3>
              <div className="space-y-3">
                {(mapping.sourceResources as any)?.map(
                  (source: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-background rounded border"
                    >
                      <AwsIcon
                        resourceType={source.resourceType || "unknown"}
                        size={32}
                        className="flex-shrink-0 mt-0.5"
                        fallback="lucide"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {source.resourceName || source.resourceId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(source.resourceId || "")
                            }
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">ID:</span>{" "}
                            {source.resourceId}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {source.resourceType}
                          </div>
                          <div>
                            <span className="font-medium">Region:</span>{" "}
                            {source.region || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Account:</span>{" "}
                            {source.awsAccountId || "N/A"}
                          </div>
                          {source.resourceArn && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">ARN:</span>
                              <span className="font-mono break-all">
                                {source.resourceArn}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(source.resourceArn || "")
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
                  ),
                )}
              </div>
            </div>
          )}

          {/* Target Resources */}
          {mapping.targetResources?.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">
                Target Resources (
                {(mapping.targetResources as any)?.length || 0})
              </h3>
              <div className="space-y-3">
                {(mapping.targetResources as any)?.map(
                  (target: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-background rounded border"
                    >
                      <AwsIcon
                        resourceType={target.resourceType || "unknown"}
                        size={32}
                        className="flex-shrink-0 mt-0.5"
                        fallback="lucide"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {target.resourceName || target.resourceId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(target.resourceId || "")
                            }
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">ID:</span>{" "}
                            {target.resourceId}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {target.resourceType}
                          </div>
                          <div>
                            <span className="font-medium">Region:</span>{" "}
                            {target.region || "N/A"}
                          </div>
                          <div>
                            <span className="font-medium">Account:</span>{" "}
                            {target.awsAccountId || "N/A"}
                          </div>
                          {target.resourceArn && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">ARN:</span>
                              <span className="font-mono break-all">
                                {target.resourceArn}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(target.resourceArn || "")
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
                  ),
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {mapping.notes && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">Notes</h3>
              <div className="bg-background p-3 rounded border text-sm">
                {mapping.notes}
              </div>
            </div>
          )}

          {/* Description */}
          {mapping.mappingDescription && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">Description</h3>
              <div className="bg-background p-3 rounded border text-sm">
                {mapping.mappingDescription}
              </div>
            </div>
          )}

          {/* History */}
          {mapping.history && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-3">History</h3>
              <div className="bg-background p-3 rounded border">
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