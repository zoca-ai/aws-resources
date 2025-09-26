"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AwsIcon } from "@/components/ui/aws-icon";
import { formatAwsResourceType } from "@/lib/aws-utils";
import { getMappingTypeConfig, formatMappingDirection } from "@/lib/utils/mapping";
import type { MigrationMapping } from "@/lib/types/mapping";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";

interface MappingCardProps {
  mapping: MigrationMapping;
  onEditNotes: (mapping: MigrationMapping) => void;
  onUpdateStatus: (mappingId: number, status: string) => void;
  onDelete: (mappingId: number) => void;
  isDeleting: boolean;
}

export function MappingCard({
  mapping,
  onEditNotes,
  onUpdateStatus,
  onDelete,
  isDeleting,
}: MappingCardProps) {
  const typeConfig = getMappingTypeConfig(mapping);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={`grid grid-cols-[300px_120px_1fr_100px] gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 mb-4 items-start ${typeConfig.color}`}
    >
      {/* Source Resources - Column 1 */}
      <div className="min-w-0">
        <div className="space-y-2">
          {mapping.sourceResources && mapping.sourceResources.length > 0 ? (
            <>
              {mapping.sourceResources
                .slice(0, 2)
                .map((source: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 min-w-0 py-1"
                  >
                    <AwsIcon
                      resourceType={source.resourceType || "unknown"}
                      size={20}
                      className="flex-shrink-0 mt-0.5"
                      fallback="lucide"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate font-medium text-sm leading-5"
                        title={source.resourceId}
                      >
                        {source.resourceName || source.resourceId || "Unknown Resource"}
                      </div>
                      <div className="mt-1 space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {formatAwsResourceType(source.resourceType || "unknown")}
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
              {mapping.sourceResources.length > 2 && (
                <div className="text-muted-foreground text-xs pl-6 py-1">
                  +{mapping.sourceResources.length - 2} more sources
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
      <div className="flex flex-col items-center justify-start gap-2 py-2">
        <TypeIcon className="h-5 w-5 text-muted-foreground" />
        <Badge variant="outline" className={`text-xs text-center ${typeConfig.badge}`}>
          {typeConfig.label}
        </Badge>
        <Badge variant="outline" className="text-xs text-center">
          {formatMappingDirection(mapping.mappingDirection || "old_to_new")}
        </Badge>
        <div className="mt-1 text-center">
          <Badge variant="secondary" className="text-xs">
            {mapping.migrationStatus?.replace("_", " ") || "not started"}
          </Badge>
        </div>
      </div>

      {/* Target Resources - Column 3 */}
      <div className="min-w-0">
        <div className="space-y-2">
          {(mapping as any).targetResources ? (
            <>
              {(mapping as any).targetResources
                .slice(0, 2)
                .map((target: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 min-w-0 py-1"
                  >
                    <AwsIcon
                      resourceType={target.resourceType}
                      size={20}
                      className="flex-shrink-0 mt-0.5"
                      fallback="lucide"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate font-medium text-sm leading-5"
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
              {(mapping as any).targetResources.length > 2 && (
                <div className="text-muted-foreground text-xs pl-6 py-1">
                  +{(mapping as any).targetResources.length - 2} more targets
                </div>
              )}
            </>
          ) : mapping.targetResources?.map((targetResource, idx) => (
            <div key={idx} className="flex items-center gap-2 min-w-0">
              <AwsIcon
                resourceType={targetResource?.resourceType || ""}
                size={20}
                className="flex-shrink-0"
                fallback="lucide"
              />
              <div className="min-w-0 flex-1">
                <div
                  className="truncate font-medium text-sm"
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
              {typeConfig.label === "Deprecated" && "Resource marked as deprecated"}
              {typeConfig.label === "For Removal" && "Resource marked for removal"}
              {typeConfig.label === "Newly Added" && "Newly added resource"}
              {typeConfig.label === "No Targets" && "No target resources"}
              {typeConfig.label === "Standard" && "No target resources"}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Column 4 */}
      <div className="flex flex-col gap-2 items-end pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10 w-8 h-8 p-0"
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditNotes(mapping as any)}
          className="text-primary hover:bg-primary/10 w-8 h-8 p-0"
          title="Edit notes"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(mapping.id as any)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive w-8 h-8 p-0"
          disabled={isDeleting}
          title="Delete mapping"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes Section - Full Width */}
      {mapping.notes && (
        <div className="col-span-4 mt-3 pt-3">
          <div className="rounded-md bg-secondary p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium text-secondary-foreground/50 text-sm">
                Notes:
              </span>
            </div>
            <div className="text-gray-700 text-sm text-secondary-foreground/50 leading-relaxed">
              {mapping.notes}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}