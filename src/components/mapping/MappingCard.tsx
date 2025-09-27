"use client";

import { useState } from "react";
import { MappingDetailsDialog } from "./MappingDetailsDialog";
import { ResourceDisplay } from "./ResourceDisplay";
import { MappingTypeDisplay } from "./MappingTypeDisplay";
import { MappingActions } from "./MappingActions";
import { getMappingTypeConfig } from "@/lib/utils/mapping";
import type { MigrationMapping } from "@/lib/types/mapping";

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

  // Helper function to get target resources message
  const getTargetResourcesMessage = () => {
    switch (typeConfig.label) {
      case "Deprecated":
        return "Resource marked as deprecated";
      case "To Be Removed":
        return "Resource marked for removal";
      case "Keep Manual":
        return "Keep as manually managed";
      case "Migrate to Terraform":
        return "Migrate to Terraform";
      case "Undecided":
        return "Migration approach not decided";
      case "Staging":
        return "Resource staged for migration";
      case "Chrone":
        return "Chrone resource do not touch";
      default:
        return "No target resources";
    }
  };

  return (
    <div
      className={`grid grid-cols-[1fr_150px_1fr_120px] gap-6 rounded-lg border border-border/30  p-6 transition-colors hover:bg-accent/50 mb-4 items-start`}
    >
      {/* Source Resources - Column 1 */}
      <div className="min-w-0 h-full border border-border rounded-md p-4">
        <ResourceDisplay
          resources={mapping.sourceResources || []}
          maxVisible={5}
          emptyStateMessage="Newly added resource"
          emptyStateIcon={TypeIcon}
        />
      </div>

      {/* Mapping Direction - Column 2 */}
      <MappingTypeDisplay mapping={mapping} />

      {/* Target Resources - Column 3 */}
      <div className="min-w-0 h-full border border-border rounded-md p-4">
        <ResourceDisplay
          resources={mapping.targetResources || []}
          maxVisible={5}
          emptyStateMessage={getTargetResourcesMessage()}
          emptyStateIcon={TypeIcon}
        />
      </div>

      {/* Action Buttons - Column 4 */}
      <MappingActions
        mapping={mapping}
        onEditNotes={onEditNotes}
        onUpdateStatus={onUpdateStatus}
        onUpdateMappingType={onUpdateMappingType}
        onDelete={onDelete}
        onViewDetails={() => setShowDetails(true)}
        isDeleting={isDeleting}
      />

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
      <MappingDetailsDialog
        mapping={mapping}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
    </div>
  );
}
