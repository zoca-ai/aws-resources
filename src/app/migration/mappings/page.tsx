"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VirtualScroll } from "@/components/ui/virtual-scroll";
import { MappingListSkeleton } from "@/components/mapping/MappingSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type RouterOutputs, api } from "@/trpc/react";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";

// Type for migration mapping from tRPC
type MigrationMapping = RouterOutputs["migration"]["mappings"]["mappings"][0];
import { MigrationNav } from "@/components/migration/MigrationNav";
import { AwsIcon } from "@/components/ui/aws-icon";
import { formatAwsResourceType } from "@/lib/aws-utils";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Save,
  Search,
  Settings,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";

const formatMappingDirection = (direction: string) => {
  switch (direction) {
    case "old_to_new":
      return "Legacy → Modern";
    case "new_to_old":
      return "Modern → Legacy";
    case "old_to_old":
      return "Legacy → Legacy";
    case "new_to_new":
      return "Modern → Modern";
    case "any_to_any":
      return "Flexible";
    default:
      return direction;
  }
};

export default function MappingsListPage() {
  // Get utils for cache management
  const utils = api.useUtils();

  // Use infinite query for better performance with large datasets
  const {
    data: mappingsData,
    isLoading: mappingsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.migration.mappingsInfinite.useInfiniteQuery(
    { limit: 50 }, // Smaller chunks for better infinite scroll performance
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  );

  // Get filter options with caching
  const { data: resourceTypesData } = api.resources.types.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - types don't change often
    refetchOnWindowFocus: false,
  });

  const { data: regionsData } = api.resources.regions.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes - regions don't change often
    refetchOnWindowFocus: false,
  });

  const updateMapping = api.migration.updateMapping.useMutation({
    onMutate: async () => {
      toast.loading("Updating mapping...", { id: "update-mapping" });
    },
    onError: (error) => {
      toast.error(`Failed to update mapping: ${error.message}`, {
        id: "update-mapping",
      });
    },
    onSuccess: () => {
      toast.success("Mapping updated successfully", { id: "update-mapping" });
      utils.migration.mappingsInfinite.invalidate();
      setEditingMapping(null);
      setEditingNotes("");
    },
  });

  const deleteMapping = api.migration.deleteMapping.useMutation({
    onMutate: async () => {
      toast.loading("Deleting mapping...", { id: "delete-mapping" });
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`, {
        id: "delete-mapping",
      });
    },
    onSuccess: () => {
      toast.success("Mapping deleted successfully", { id: "delete-mapping" });
      // Invalidate to get fresh data
      utils.migration.mappingsInfinite.invalidate();
    },
  });

  // Flatten mappings from all pages
  const mappings = useMemo(() => {
    return mappingsData?.pages.flatMap((page) => page.mappings) || [];
  }, [mappingsData]);

  // Filters and search
  const [search, setSearch] = useState("");
  const [mappingTypeFilter, setMappingTypeFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedMappings, setSelectedMappings] = useState<string[]>([]);
  const [editingMapping, setEditingMapping] = useState<MigrationMapping | null>(
    null,
  );
  const [editingNotes, setEditingNotes] = useState<string>("");
  const [containerHeight, setContainerHeight] = useState(600); // Default height

  // Calculate container height on mount and resize
  useEffect(() => {
    const calculateHeight = () => {
      const height = window.innerHeight - 300; // Account for header, nav, filters
      setContainerHeight(Math.max(400, height)); // Minimum 400px
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, []);

  // Delete mapping handler
  const handleDeleteMapping = async (mappingId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this mapping? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteMapping.mutateAsync({ id: mappingId });
    } catch (error) {
      console.error("Failed to delete mapping:", error);
    }
  };

  // Handle editing notes
  const handleEditNotes = (mapping: MigrationMapping) => {
    setEditingMapping(mapping);
    setEditingNotes(mapping.notes || "");
  };

  // Handle saving notes
  const handleSaveNotes = async () => {
    if (!editingMapping) return;

    try {
      await updateMapping.mutateAsync({
        id: editingMapping.id,
        notes: editingNotes,
      });
    } catch (error) {
      console.error("Failed to update mapping notes:", error);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingMapping(null);
    setEditingNotes("");
  };

  // Handle status update
  const handleUpdateStatus = async (mappingId: number, newStatus: string) => {
    try {
      await updateMapping.mutateAsync({
        id: mappingId,
        migrationStatus: newStatus as any,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  // Apply filters
  const filteredMappings = useMemo(() => {
    if (!mappings.length) return [];

    const searchLower = search.toLowerCase();

    return mappings.filter((mapping: any) => {
      // Search filter
      if (
        search &&
        !(
          mapping.sourceResourceName?.toLowerCase().includes(searchLower) ||
          mapping.sourceResourceId?.toLowerCase().includes(searchLower) ||
          mapping.sourceResourceType?.toLowerCase().includes(searchLower) ||
          mapping.notes?.toLowerCase().includes(searchLower)
        )
      ) {
        return false;
      }

      // Resource type filter
      if (
        resourceTypeFilter &&
        resourceTypeFilter !== "all" &&
        mapping.sourceResourceType !== resourceTypeFilter
      ) {
        return false;
      }

      // Region filter
      if (
        regionFilter &&
        regionFilter !== "all" &&
        mapping.sourceRegion !== regionFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    search,
    mappingTypeFilter,
    resourceTypeFilter,
    regionFilter,
    dateFilter,
    mappings,
  ]);

  // Statistics

  // Get filter options from API data
  const filterOptions = useMemo(() => {
    return {
      resourceTypes:
        resourceTypesData?.map((item) => item.type).filter(Boolean) ?? [],
      regions: regionsData?.map((item) => item.region).filter(Boolean) ?? [],
    };
  }, [resourceTypesData, regionsData]);

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <MigrationNav />

      {/* Filters and Actions */}
      <Card className="mx-6 mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Search Bar */}
            <div className="relative max-w-sm flex-1">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
              <Input
                placeholder="Search mappings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 lg:flex-nowrap">
              <Select
                value={mappingTypeFilter}
                onValueChange={setMappingTypeFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="same-type">Same Type</SelectItem>
                  <SelectItem value="cross-type">Cross Type</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={resourceTypeFilter}
                onValueChange={setResourceTypeFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Resource Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resource Types</SelectItem>
                  {filterOptions.resourceTypes.map((type: string) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {filterOptions.regions.map((region: string) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between text-gray-600 text-sm">
            <div>
              {mappingsLoading
                ? "Loading mappings..."
                : `Showing ${filteredMappings.length} of ${mappings.length} mappings`}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setMappingTypeFilter("all");
                setResourceTypeFilter("all");
                setRegionFilter("all");
                setDateFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mappings List with Virtual Scrolling */}
      <div className="flex-1 mx-6 mt-6 mb-6">
        <Card className="h-full">
          <CardContent className="pt-6 h-full">
            {mappingsLoading && mappings.length === 0 ? (
              <MappingListSkeleton count={10} />
            ) : filteredMappings.length > 0 ? (
              <VirtualScroll
                items={filteredMappings}
                itemHeight={150}
                containerHeight={containerHeight}
                renderItem={(mapping, index) => (
                  <div
                    key={mapping.id || `mapping-${index}`}
                    className="grid grid-cols-[300px_120px_1fr_100px] gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50 mb-4 items-start"
                  >
                    {/* Source Resource - Column 1 (Fixed 300px) */}
                    <div className="flex items-start gap-3 min-w-0">
                      <AwsIcon
                        resourceType={mapping.sourceResourceType || "unknown"}
                        size={24}
                        className="flex-shrink-0 mt-0.5"
                        fallback="lucide"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-medium text-sm leading-5"
                          title={mapping.sourceResourceId}
                        >
                          {mapping.sourceResourceName ||
                            mapping.sourceResourceId ||
                            "Unknown Resource"}
                        </div>
                        <div className="mt-2 space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {formatAwsResourceType(
                              mapping.sourceResourceType || "unknown",
                            )}
                          </Badge>
                          <br />
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-800 text-xs"
                          >
                            {mapping.sourceCategory || "old"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Mapping Direction - Column 2 (Fixed 120px) */}
                    <div className="flex flex-col items-center justify-start gap-2 py-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs text-center">
                        {formatMappingDirection(
                          mapping.mappingDirection || "old_to_new",
                        )}
                      </Badge>
                      <div className="mt-1 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {mapping.migrationStatus?.replace("_", " ") ||
                            "not started"}
                        </Badge>
                      </div>
                    </div>

                    {/* Target Resources - Column 3 (Flexible) */}
                    <div className="min-w-0">
                      {/* Target Resources List */}
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
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {formatAwsResourceType(
                                          target.resourceType,
                                        )}
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
                                +{(mapping as any).targetResources.length - 2}{" "}
                                more targets
                              </div>
                            )}
                          </>
                        ) : (
                          mapping.targetResources?.map(
                            (targetResource, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 min-w-0"
                              >
                                <AwsIcon
                                  resourceType={
                                    targetResource?.resourceType || ""
                                  }
                                  size={20}
                                  className="flex-shrink-0"
                                  fallback="lucide"
                                />
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="truncate font-medium text-sm"
                                    title={targetResource?.resourceId}
                                  >
                                    {targetResource?.resourceName ||
                                      targetResource?.resourceId}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {targetResource?.resourceType &&
                                        formatAwsResourceType(
                                          targetResource?.resourceType,
                                        )}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ),
                          ) || (
                            <div className="text-muted-foreground text-sm">
                              No target resources
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Column 4 (Fixed 100px) */}
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
                            onClick={() =>
                              handleUpdateStatus(
                                mapping.id as any,
                                "not_started",
                              )
                            }
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Not Started
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(
                                mapping.id as any,
                                "in_progress",
                              )
                            }
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(mapping.id as any, "completed")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(mapping.id as any, "migrated")
                            }
                          >
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            Migrated
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStatus(mapping.id as any, "failed")
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            Failed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNotes(mapping as any)}
                        className="text-primary hover:bg-primary/10 w-8 h-8 p-0"
                        title="Edit notes"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(mapping.id as any)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive w-8 h-8 p-0"
                        disabled={deleteMapping.isPending}
                        title="Delete mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Notes Section - Full Width */}
                    {mapping.notes && (
                      <div className="col-span-4 mt-3 pt-3 ">
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
                )}
                onLoadMore={() => {
                  if (hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                  }
                }}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            ) : (
              <div className="py-12 text-center text-gray-500">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <div className="mb-2 font-medium text-lg">
                  No mappings found
                </div>
                <p>No mappings match your current filters.</p>
                <Link href="/migration/map" className="mt-4 inline-block">
                  <Button>Create First Mapping</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes Editing Dialog */}
      <Dialog
        open={!!editingMapping}
        onOpenChange={(open) => !open && handleCancelEdit()}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Mapping Notes</DialogTitle>
            <DialogDescription>
              Add or edit notes for this mapping between{" "}
              {editingMapping?.sourceResourceName ||
                editingMapping?.sourceResourceId}{" "}
              and its targets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-medium text-sm">Notes</label>
              <Textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add any notes about this mapping..."
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <div className="text-muted-foreground text-xs">
                {editingNotes.length}/1000 characters
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updateMapping.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
