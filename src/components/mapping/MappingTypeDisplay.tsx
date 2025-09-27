"use client";

import { Badge } from "@/components/ui/badge";
import { getMappingTypeConfig } from "@/lib/utils/mapping";
import type { MigrationMapping } from "@/lib/types/mapping";

interface MappingTypeDisplayProps {
  mapping: MigrationMapping;
}

export function MappingTypeDisplay({ mapping }: MappingTypeDisplayProps) {
  const typeConfig = getMappingTypeConfig(mapping);
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4 min-h-[120px]">
      <TypeIcon className="h-6 w-6 text-muted-foreground" />
      <Badge variant="outline" className={`text-xs text-center px-2 py-1`}>
        {typeConfig.label}
      </Badge>
      <div className="text-center">
        <Badge variant="secondary" className="text-xs px-2 py-1">
          {mapping.migrationStatus?.replace("_", " ") || "not started"}
        </Badge>
      </div>
    </div>
  );
}
