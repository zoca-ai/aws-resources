"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Shuffle,
  Split,
  Timer,
  Tags,
  Hand,
  FileText,
} from "lucide-react";

interface MappingActionsProps {
  mapping: MigrationMapping;
  onEditNotes: (mapping: MigrationMapping) => void;
  onUpdateStatus: (mappingId: number, status: string) => void;
  onUpdateMappingType: (mappingId: number, mappingType: string) => void;
  onDelete: (mappingId: number) => void;
  onViewDetails: () => void;
  isDeleting: boolean;
}

export function MappingActions({
  mapping,
  onEditNotes,
  onUpdateStatus,
  onUpdateMappingType,
  onDelete,
  onViewDetails,
  isDeleting,
}: MappingActionsProps) {
  return (
    <div className="flex flex-col gap-3 items-center pt-2">
      {/* Status Update Dropdown */}
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
            onClick={() => onUpdateStatus(mapping.id, "not_started")}
          >
            <Clock className="mr-2 h-4 w-4" />
            Not Started
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateStatus(mapping.id, "in_progress")}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            In Progress
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateStatus(mapping.id, "completed")}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Completed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateStatus(mapping.id, "migrated")}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Migrated
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateStatus(mapping.id, "failed")}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-600" />
            Failed
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mapping Type Update Dropdown */}
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
            onClick={() => onUpdateMappingType(mapping.id, "replacement")}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            Replacement
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "consolidation")}
          >
            <Merge className="mr-2 h-4 w-4" />
            Consolidation
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "split")}
          >
            <Split className="mr-2 h-4 w-4" />
            Split
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "dependency")}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Dependency
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "keep_manual")}
          >
            <Hand className="mr-2 h-4 w-4" />
            Keep Manual
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "migrate_terraform")}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Migrate to Terraform
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "to_be_removed")}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            To Be Removed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "deprecated")}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Deprecated
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "undecided")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Undecided
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "staging")}
          >
            <Clock className="mr-2 h-4 w-4" />
            Staging
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onUpdateMappingType(mapping.id, "chrone")}
          >
            <Timer className="mr-2 h-4 w-4" />
            Chrone
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Details Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onViewDetails}
        className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Edit Notes Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditNotes(mapping)}
        className="text-primary hover:bg-primary/10 w-9 h-9 p-0"
        title="Edit notes"
      >
        <Edit className="h-4 w-4" />
      </Button>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(mapping.id)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-9 h-9 p-0"
        disabled={isDeleting}
        title="Delete mapping"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}