"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { type RouterOutputs, api } from "@/trpc/react";
import React, { useState, useMemo } from "react";
import { toast } from "sonner";

// Type for migration mapping from tRPC
type MigrationMapping = RouterOutputs["migration"]["mappings"]["mappings"][0];
import { MigrationNav } from "@/components/migration/MigrationNav";
import { AwsIcon } from "@/components/ui/aws-icon";
import { formatAwsResourceType } from "@/lib/aws-utils";
import { cn } from "@/lib/utils";
import {
	AlertCircle,
	ArrowRight,
	BarChart3,
	CheckCircle,
	Clock,
	Edit,
	GitBranch,
	Merge,
	Save,
	Search,
	Shuffle,
	Split,
	Trash2,
	X,
	XCircle,
} from "lucide-react";
import Link from "next/link";

const getPriorityColor = (priority: string) => {
	switch (priority) {
		case "critical":
			return "bg-red-100 text-red-800 border-red-200";
		case "high":
			return "bg-orange-100 text-orange-800 border-orange-200";
		case "medium":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "low":
			return "bg-green-100 text-green-800 border-green-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getMappingTypeIcon = (mappingType: string) => {
	switch (mappingType) {
		case "replacement":
			return Shuffle;
		case "consolidation":
			return Merge;
		case "split":
			return Split;
		case "dependency":
			return GitBranch;
		default:
			return Shuffle;
	}
};

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

	const { data: mappingsData, refetch } = api.migration.mappings.useQuery({
		limit: 250,
	}, {
		staleTime: 1 * 60 * 1000, // 1 minute - mappings change frequently
		refetchOnWindowFocus: true,
	});

	const updateMapping = api.migration.updateMapping.useMutation({
		onMutate: async () => {
			toast.loading('Updating mapping...', { id: 'update-mapping' });
		},
		onError: (error) => {
			toast.error(`Failed to update mapping: ${error.message}`, {
				id: 'update-mapping',
			});
		},
		onSuccess: () => {
			toast.success('Mapping updated successfully', { id: 'update-mapping' });
			utils.migration.mappings.invalidate();
			setEditingMapping(null);
			setEditingNotes('');
		},
	});

	const deleteMapping = api.migration.deleteMapping.useMutation({
		onMutate: async (variables) => {
			// Optimistically remove from cache
			await utils.migration.mappings.cancel();

			const previousData = utils.migration.mappings.getData({ limit: 250 });

			utils.migration.mappings.setData({ limit: 250 }, (old) => ({
				...old,
				mappings: old?.mappings?.filter(m => m.id !== variables.id) || [],
			}));

			return { previousData };
		},
		onError: (error, variables, context) => {
			// Rollback on error
			if (context?.previousData) {
				utils.migration.mappings.setData({ limit: 250 }, context.previousData);
			}
		},
		onSuccess: () => {
			// Invalidate to get fresh data
			utils.migration.mappings.invalidate();
		},
	});

	const mappings = mappingsData?.mappings || [];

	// Filters and search
	const [search, setSearch] = useState("");
	const [mappingTypeFilter, setMappingTypeFilter] = useState<string>("all");
	const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
	const [regionFilter, setRegionFilter] = useState<string>("all");
	const [dateFilter, setDateFilter] = useState<string>("all");
	const [selectedMappings, setSelectedMappings] = useState<string[]>([]);
	const [editingMapping, setEditingMapping] = useState<MigrationMapping | null>(null);
	const [editingNotes, setEditingNotes] = useState<string>('');

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
		setEditingNotes(mapping.notes || '');
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
		setEditingNotes('');
	};

	// Apply filters
	const filteredMappings = useMemo(() => {
		let filtered = mappings;

		if (search) {
			const searchLower = search.toLowerCase();
			filtered = filtered.filter(
				(mapping: MigrationMapping) =>
					mapping.sourceResourceName?.toLowerCase().includes(searchLower) ||
					mapping.sourceResourceId?.toLowerCase().includes(searchLower) ||
					mapping.sourceResourceType?.toLowerCase().includes(searchLower) ||
					mapping.notes?.toLowerCase().includes(searchLower),
			);
		}

		if (resourceTypeFilter && resourceTypeFilter !== "all") {
			filtered = filtered.filter(
				(mapping: MigrationMapping) =>
					mapping.sourceResourceType === resourceTypeFilter,
			);
		}

		if (regionFilter && regionFilter !== "all") {
			filtered = filtered.filter(
				(mapping: MigrationMapping) => mapping.sourceRegion === regionFilter,
			);
		}

		return filtered;
	}, [search, mappingTypeFilter, resourceTypeFilter, regionFilter, dateFilter]);

	// Statistics

	// Get unique values for filters
	const filterOptions = useMemo(() => {
		const resourceTypes = new Set<string>();
		const regions = new Set<string>();

		mappings.forEach((mapping: MigrationMapping) => {
			if (mapping.sourceResourceType) {
				resourceTypes.add(mapping.sourceResourceType);
			}
			if (mapping.sourceRegion) {
				regions.add(mapping.sourceRegion);
			}
		});

		return {
			resourceTypes: Array.from(resourceTypes).sort(),
			regions: Array.from(regions).sort(),
		};
	}, [mappings]);

	return (
		<div className="min-h-screen space-y-6">
			{/* Navigation */}
			<MigrationNav />

			{/* Filters and Actions */}
			<Card>
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
							Showing {filteredMappings.length} of {mappings.length} mappings
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

			{/* Mappings List */}
			<Card>
				<CardContent className="pt-6">
					<div className="max-h-[70vh] space-y-4 overflow-y-auto">
						{filteredMappings.map((mapping) => {
							return (
								<div
									key={
										mapping.id ||
										mapping.mappingGroupId ||
										`mapping-${Math.random()}`
									}
									className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
								>
									{/* Source Resource */}
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<AwsIcon
											resourceType={mapping.sourceResourceType || "unknown"}
											size={24}
											className="flex-shrink-0"
											fallback="lucide"
										/>
										<div className="min-w-0">
											<div
												className="max-w-[180px] truncate font-medium"
												title={mapping.sourceResourceId}
											>
												{mapping.sourceResourceName ||
													mapping.sourceResourceId ||
													"Unknown Resource"}
											</div>
											<div className="mt-1 flex items-center gap-1">
												<Badge variant="outline" className="text-xs">
													{formatAwsResourceType(
														mapping.sourceResourceType || "unknown",
													)}
												</Badge>
												<Badge
													variant="outline"
													className="border-blue-200 bg-blue-50 text-blue-800 text-xs"
												>
													{mapping.sourceCategory || "old"}
												</Badge>
											</div>
										</div>
									</div>

									{/* Mapping Type & Direction */}
									<div className="flex flex-col items-center gap-1">
										<ArrowRight className="h-4 w-4 text-muted-foreground" />
										<Badge variant="outline" className="text-xs capitalize">
											{mapping.mappingDirection || "old_to_new"}
										</Badge>
									</div>

									<ArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />

									{/* Status and Info */}
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<div className="w-full min-w-0">
											<div className="mb-2 flex items-center gap-2">
												<Badge variant="secondary" className="text-xs">
													{mapping.migrationStatus?.replace("_", " ") ||
														"not started"}
												</Badge>
												<Badge variant="outline" className="text-xs">
													{formatMappingDirection(
														mapping.mappingDirection || "old_to_new",
													)}
												</Badge>
											</div>
											{(mapping as any).targetResources ? (
												<>
													<div className="space-y-2">
														{(mapping as any).targetResources
															.slice(0, 2)
															.map((target: any, idx: number) => (
																<div
																	key={idx}
																	className="flex items-center gap-2"
																>
																	<AwsIcon
																		resourceType={target.resourceType}
																		size={20}
																		className="flex-shrink-0"
																		fallback="lucide"
																	/>
																	<div className="min-w-0 flex-1">
																		<div
																			className="max-w-[140px] truncate font-medium"
																			title={target.resourceId}
																		>
																			{target.resourceName || target.resourceId}
																		</div>
																		<div className="flex items-center gap-1">
																			<Badge
																				variant="outline"
																				className="text-xs"
																			>
																				{formatAwsResourceType(
																					target.resourceType,
																				)}
																			</Badge>
																			<Badge
																				variant="outline"
																				className="border-green-200 bg-green-50 text-green-800 text-xs"
																			>
																				{target.category}
																			</Badge>
																		</div>
																	</div>
																</div>
															))}
														{(mapping as any).targetResources.length > 2 && (
															<div className="pl-6 text-muted-foreground text-xs">
																+{(mapping as any).targetResources.length - 2}{" "}
																more targets
															</div>
														)}
													</div>
												</>
											) : (
												mapping.targetResources?.map((targetResource, idx) => (
													<div key={idx} className="flex items-center gap-2">
														<AwsIcon
															resourceType={targetResource?.resourceType || ""}
															size={24}
															className="flex-shrink-0"
															fallback="lucide"
														/>
														<div className="min-w-0">
															<div
																className="max-w-[180px] truncate font-medium"
																title={targetResource?.resourceId}
															>
																{targetResource?.resourceName ||
																	targetResource?.resourceId}
															</div>
															<div className="mt-1 flex items-center gap-1">
																<Badge variant="outline" className="text-xs">
																	{targetResource?.resourceType &&
																		formatAwsResourceType(
																			targetResource?.resourceType,
																		)}
																</Badge>
															</div>
														</div>
													</div>
												)) || []
											)}
										</div>
									</div>

									{/* Action Buttons */}
									<div className="flex flex-shrink-0 items-center gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEditNotes(mapping)}
											className="text-primary hover:bg-primary/10"
											title="Edit notes"
										>
											<Edit className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDeleteMapping(mapping.id)}
											className="text-destructive hover:bg-destructive/10 hover:text-destructive"
											disabled={deleteMapping.isPending}
											title="Delete mapping"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>

									{/* Notes Section */}
									{mapping.notes && (
										<div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
											<div className="mb-1 flex items-center gap-2">
												<span className="font-medium text-gray-900 text-sm">
													Notes:
												</span>
											</div>
											<div className="text-gray-700 text-sm">
												{mapping.notes}
											</div>
										</div>
									)}
								</div>
							);
						})}

						{filteredMappings.length === 0 && (
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
					</div>
				</CardContent>
			</Card>

			{/* Notes Editing Dialog */}
			<Dialog open={!!editingMapping} onOpenChange={(open) => !open && handleCancelEdit()}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Edit Mapping Notes</DialogTitle>
						<DialogDescription>
							Add or edit notes for this mapping between {editingMapping?.sourceResourceName || editingMapping?.sourceResourceId} and its targets.
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
