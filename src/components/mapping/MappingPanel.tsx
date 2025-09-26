import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_RESOURCE_ICON,
  MAPPING_CONFIDENCE_COLORS,
  RESOURCE_ICONS,
} from "@/lib/constants/mapping";
import { formatResourceType } from "@/lib/format-utils";
import type { MappingPanelProps } from "@/lib/types/mapping";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Link,
  Search,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const getResourceIcon = (resourceType: string): string => {
  return RESOURCE_ICONS[resourceType] || DEFAULT_RESOURCE_ICON;
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 80) return MAPPING_CONFIDENCE_COLORS.high;
  if (confidence >= 60) return MAPPING_CONFIDENCE_COLORS.medium;
  return MAPPING_CONFIDENCE_COLORS.low;
};

export const MappingPanel: React.FC<MappingPanelProps> = ({
  resource,
  suggestedMappings,
  onMap,
  onClose,
  loading = false,
}) => {
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredSuggestions = suggestedMappings.filter(
    (suggestion) =>
      !searchTerm ||
      suggestion.resourceName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      suggestion.resourceId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleConfirm = () => {
    onMap(Array.from(selectedTargetIds), notes.trim() || undefined);
    setSelectedTargetIds(new Set());
    setNotes("");
  };

  if (!resource) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-600" />
            Map Resource
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Source Resource */}
        <div>
          <Label className="mb-2 block font-medium text-sm">
            Resource to Map
          </Label>
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <span className="text-lg">
              {getResourceIcon(resource.resourceType)}
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="truncate font-medium"
                title={resource.resourceName || resource.resourceId}
              >
                {(resource.resourceName || resource.resourceId).length > 40
                  ? `${(resource.resourceName || resource.resourceId).substring(0, 40)}...`
                  : resource.resourceName || resource.resourceId}
              </div>
              <div className="text-muted-foreground text-sm">
                {formatResourceType(resource.resourceType)} • {resource.region}
              </div>
            </div>
          </div>
        </div>

        {/* Search Target Resources */}
        <div>
          <Label className="mb-2 block font-medium text-sm">
            Select Target Resource
          </Label>
          <div className="relative mb-3">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              placeholder="Search target resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Suggested Mappings */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Skeleton className="h-6 w-6" />
                  <div className="flex-1">
                    <Skeleton className="mb-1 h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-64 rounded-lg border">
              <div className="space-y-2 p-2">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion) => {
                    const confidence = Math.floor(Math.random() * 30) + 70; // Placeholder confidence
                    const isSelected = selectedTargetIds.has(suggestion.resourceId);

                    return (
                      <div
                        key={suggestion.resourceId}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all",
                          isSelected
                            ? "border border-primary bg-primary/10"
                            : "border border-transparent hover:bg-accent",
                        )}
                        onClick={() => {
                          const newSelected = new Set(selectedTargetIds);
                          if (isSelected) {
                            newSelected.delete(suggestion.resourceId);
                          } else {
                            newSelected.add(suggestion.resourceId);
                          }
                          setSelectedTargetIds(newSelected);
                        }}
                      >
                        <span className="text-lg">
                          {getResourceIcon(suggestion.resourceType)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate font-medium"
                            title={
                              suggestion.resourceName || suggestion.resourceId
                            }
                          >
                            {(suggestion.resourceName || suggestion.resourceId)
                              .length > 35
                              ? `${(suggestion.resourceName || suggestion.resourceId).substring(0, 35)}...`
                              : suggestion.resourceName ||
                                suggestion.resourceId}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {formatResourceType(suggestion.resourceType)} •{" "}
                            {suggestion.region}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getConfidenceColor(confidence),
                            )}
                          >
                            {confidence}%
                          </Badge>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    {searchTerm ? (
                      <>
                        <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <div>No resources match your search</div>
                        <div className="text-sm">Try different keywords</div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <div>No suggested mappings</div>
                        <div className="text-sm">
                          Manual mapping may be required
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Mapping Preview */}
        {selectedTargetIds.size > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900 text-sm">
                Mapping Preview
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className="max-w-[120px] truncate"
                title={resource.resourceName || resource.resourceId}
              >
                {(resource.resourceName || resource.resourceId).length > 15
                  ? `${(resource.resourceName || resource.resourceId).substring(0, 15)}...`
                  : resource.resourceName || resource.resourceId}
              </span>
              <ArrowRight className="h-4 w-4 text-green-600" />
              <span
                className="max-w-[120px] truncate"
                title={
                  selectedTargetIds.size === 1
                    ? filteredSuggestions.find(
                        (s) => s.resourceId === Array.from(selectedTargetIds)[0],
                      )?.resourceName ||
                      filteredSuggestions.find(
                        (s) => s.resourceId === Array.from(selectedTargetIds)[0],
                      )?.resourceId
                    : `${selectedTargetIds.size} selected targets`
                }
              >
                {(() => {
                  if (selectedTargetIds.size === 1) {
                    const firstTargetId = Array.from(selectedTargetIds)[0];
                    const targetName =
                      filteredSuggestions.find(
                        (s) => s.resourceId === firstTargetId,
                      )?.resourceName ||
                      filteredSuggestions.find(
                        (s) => s.resourceId === firstTargetId,
                      )?.resourceId ||
                      "";
                    return targetName.length > 15
                      ? `${targetName.substring(0, 15)}...`
                      : targetName;
                  } else {
                    return `${selectedTargetIds.size} targets`;
                  }
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label
            htmlFor="mapping-notes"
            className="mb-2 block font-medium text-sm"
          >
            Notes (Optional)
          </Label>
          <Textarea
            id="mapping-notes"
            placeholder="Add any notes about this mapping..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px]"
            maxLength={500}
          />
          <div className="mt-1 text-muted-foreground text-xs">
            {notes.length}/500 characters
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            Create Mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
