"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Settings,
  Trash2,
  XCircle,
  GitBranch,
  Merge,
  Plus,
  Shuffle,
  Split,
  Timer,
  Tags,
  Hand,
  FileText,
  Copy,
} from "lucide-react";

interface MappingCardProps {
  mapping: MigrationMapping;
  onEditNotes: (mapping: MigrationMapping) => void;
  onUpdateStatus: (mappingId: number, status: string) => void;
  onUpdateMappingType: (mappingId: number, mappingType: string) => void;
  onDelete: (mappingId: number) => void;
  isDeleting: boolean;
}

export function MappingCard({
  mapping,
  onEditNotes,
  onUpdateStatus,
  onUpdateMappingType,
  onDelete,
  isDeleting,
}: MappingCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const typeConfig = getMappingTypeConfig(mapping);
  const TypeIcon = typeConfig.icon;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      className={`grid grid-cols-[1fr_150px_1fr_120px] gap-6 rounded-lg border p-6 transition-colors hover:bg-accent/50 mb-4 items-start ${typeConfig.color}`}
    >
      {/* Source Resources - Column 1 */}
      <div className="min-w-0 h-full">
        <div className="space-y-2 grid grid-cols-3">
          {mapping.sourceResources && mapping.sourceResources.length > 0 ? (
            <>
              {mapping.sourceResources
                .slice(0, 5)
                .map((source: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 min-w-0 py-2"
                  >
                    <AwsIcon
                      resourceType={source.resourceType || "unknown"}
                      size={40}
                      className="flex-shrink-0 mt-0.5"
                      fallback="lucide"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-medium text-sm leading-5 break-all"
                        title={source.resourceId}
                      >
                        {source.resourceName ||
                          source.resourceId ||
                          "Unknown Resource"}
                      </div>
                      <div className="mt-1 space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {formatAwsResourceType(
                            source.resourceType || "unknown",
                          )}
                        </Badge>
                        <br />
                        <Badge
                          variant="outline"
                          className="border-blue-200 bg-blue-50 text-blue-800 text-xs"
                        >
                          {source.category || "old"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              {mapping.sourceResources.length > 5 && (
                <div className="text-muted-foreground text-xs pl-8 py-1">
                  +{mapping.sourceResources.length - 5} more sources
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-sm flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              No source resources
            </div>
          )}
        </div>
      </div>

      {/* Mapping Direction - Column 2 */}
      <div className="flex flex-col items-center justify-center gap-3 py-4 min-h-[120px]">
        <TypeIcon className="h-6 w-6 text-muted-foreground" />
        <Badge
          variant="outline"
          className={`text-xs text-center px-2 py-1 ${typeConfig.badge}`}
        >
          {typeConfig.label}
        </Badge>
        <Badge variant="outline" className="text-xs text-center px-2 py-1">
          {formatMappingDirection(mapping.mappingDirection || "old_to_new")}
        </Badge>
        <div className="text-center">
          <Badge variant="secondary" className="text-xs px-2 py-1">
            {mapping.migrationStatus?.replace("_", " ") || "not started"}
          </Badge>
        </div>
      </div>

      {/* Target Resources - Column 3 */}
      <div className="min-w-0 h-full">
        <div className="space-y-2 grid grid-cols-3">
          {(mapping as any).targetResources ? (
            <>
              {(mapping as any).targetResources
                .slice(0, 5)
                .map((target: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 min-w-0 py-2"
                  >
                    <AwsIcon
                      resourceType={target.resourceType}
                      size={40}
                      className="flex-shrink-0 mt-0.5"
                      fallback="lucide"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-medium text-sm leading-5 break-all"
                        title={target.resourceId}
                      >
                        {target.resourceName || target.resourceId}
                      </div>
                      <div className="mt-1 space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {formatAwsResourceType(target.resourceType)}
                        </Badge>
                        <br />
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-800 text-xs"
                        >
                          {target.category || "new"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              {(mapping as any).targetResources.length > 5 && (
                <div className="text-muted-foreground text-xs pl-8 py-1">
                  +{(mapping as any).targetResources.length - 5} more targets
                </div>
              )}
            </>
          ) : (
            mapping.targetResources?.map((targetResource, idx) => (
              <div key={idx} className="flex items-center gap-2 min-w-0">
                <AwsIcon
                  resourceType={targetResource?.resourceType || ""}
                  size={20}
                  className="flex-shrink-0"
                  fallback="lucide"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="font-medium text-sm break-all"
                    title={targetResource?.resourceId}
                  >
                    {targetResource?.resourceName || targetResource?.resourceId}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {targetResource?.resourceType &&
                        formatAwsResourceType(targetResource?.resourceType)}
                    </Badge>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-muted-foreground text-sm flex items-center gap-2">
                <TypeIcon className="h-4 w-4" />
                {typeConfig.label === "Deprecated" &&
                  "Resource marked as deprecated"}
                {typeConfig.label === "To Be Removed" &&
                  "Resource marked for removal"}
                {typeConfig.label === "Keep Manual" &&
                  "Keep as manually managed"}
                {typeConfig.label === "Migrate to Terraform" &&
                  "Migrate to Terraform"}
                {typeConfig.label === "Undecided" &&
                  "Migration approach not decided"}
                {typeConfig.label === "Staging" &&
                  "Resource staged for migration"}
                {typeConfig.label === "Chrone" &&
                  "Chronological migration category"}
                {!mapping.targetResources?.length && "No target resources"}
              </div>
            )
          )}
        </div>
      </div>

      {/* Action Buttons - Column 4 */}
      <div className="flex flex-col gap-3 items-center pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
              title="Update status"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onUpdateStatus(mapping.id as any, "not_started")}
            >
              <Clock className="mr-2 h-4 w-4" />
              Not Started
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateStatus(mapping.id as any, "in_progress")}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateStatus(mapping.id as any, "completed")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateStatus(mapping.id as any, "migrated")}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
              Migrated
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateStatus(mapping.id as any, "failed")}
            >
              <XCircle className="mr-2 h-4 w-4 text-red-600" />
              Failed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
              title="Change mapping type"
            >
              <Tags className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "replacement")
              }
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Replacement
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "consolidation")
              }
            >
              <Merge className="mr-2 h-4 w-4" />
              Consolidation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateMappingType(mapping.id as any, "split")}
            >
              <Split className="mr-2 h-4 w-4" />
              Split
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "dependency")
              }
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Dependency
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "keep_manual")
              }
            >
              <Hand className="mr-2 h-4 w-4" />
              Keep Manual
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "migrate_terraform")
              }
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Migrate to Terraform
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "to_be_removed")
              }
            >
              <Trash2 className="mr-2 h-4 w-4" />
              To Be Removed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "deprecated")
              }
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Deprecated
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                onUpdateMappingType(mapping.id as any, "undecided")
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              Undecided
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateMappingType(mapping.id as any, "staging")}
            >
              <Clock className="mr-2 h-4 w-4" />
              Staging
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdateMappingType(mapping.id as any, "chrone")}
            >
              <Timer className="mr-2 h-4 w-4" />
              Chrone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(true)}
          className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditNotes(mapping as any)}
          className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
          title="Edit notes"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(mapping.id as any)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive w-9 h-9 p-0"
          disabled={isDeleting}
          title="Delete mapping"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes Section - Full Width */}
      {mapping.notes && (
        <div className="col-span-4 mt-4 pt-2">
          <div className="rounded-md bg-secondary p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium text-secondary-foreground/70 text-sm">
                Notes:
              </span>
            </div>
            <div className="text-secondary-foreground/80 text-sm leading-relaxed">
              {mapping.notes}
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
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
                      onClick={() => copyToClipboard(mapping.id?.toString() || "")}
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
                        onClick={() => copyToClipboard(mapping.mappingGroupId || "")}
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
                    <span className="ml-2">{formatMappingDirection(mapping.mappingDirection || "old_to_new")}</span>
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
                      {mapping.createdAt ? new Date(mapping.createdAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>
                    <span className="ml-2 text-muted-foreground">
                      {mapping.updatedAt ? new Date(mapping.updatedAt).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Source Resources */}
            {mapping.sourceResources && Array.isArray(mapping.sourceResources) && mapping.sourceResources.length > 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Source Resources ({mapping.sourceResources.length})
                </h3>
                <div className="space-y-3">
                  {mapping.sourceResources.map((source: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded border">
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
                            onClick={() => copyToClipboard(source.resourceId || "")}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div><span className="font-medium">ID:</span> {source.resourceId}</div>
                          <div><span className="font-medium">Type:</span> {source.resourceType}</div>
                          <div><span className="font-medium">Region:</span> {source.region || "N/A"}</div>
                          <div><span className="font-medium">Account:</span> {source.awsAccountId || "N/A"}</div>
                          {source.resourceArn && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">ARN:</span>
                              <span className="font-mono break-all">{source.resourceArn}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(source.resourceArn || "")}
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
            ) : null}

            {/* Target Resources */}
            {mapping.targetResources && Array.isArray(mapping.targetResources) && mapping.targetResources.length > 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <h3 className="font-semibold text-sm mb-3">
                  Target Resources ({mapping.targetResources.length})
                </h3>
                <div className="space-y-3">
                  {mapping.targetResources.map((target: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded border">
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
                            onClick={() => copyToClipboard(target.resourceId || "")}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div><span className="font-medium">ID:</span> {target.resourceId}</div>
                          <div><span className="font-medium">Type:</span> {target.resourceType}</div>
                          <div><span className="font-medium">Region:</span> {target.region || "N/A"}</div>
                          <div><span className="font-medium">Account:</span> {target.awsAccountId || "N/A"}</div>
                          {target.resourceArn && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">ARN:</span>
                              <span className="font-mono break-all">{target.resourceArn}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(target.resourceArn || "")}
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
            ) : null}

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
                    {typeof mapping.history === 'string'
                      ? mapping.history
                      : JSON.stringify(mapping.history, null, 2)
                    }
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
