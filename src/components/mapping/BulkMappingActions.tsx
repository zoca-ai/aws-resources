import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MappingResource } from "@/hooks/use-mapping";
import { DEFAULT_RESOURCE_ICON, RESOURCE_ICONS } from "@/lib/constants/mapping";
import {
	AlertTriangle,
	ArrowRight,
	GitBranch,
	Link,
	Merge,
	Save,
	Shuffle,
	Split,
	X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { AwsIcon } from "../ui/aws-icon";

interface BulkMappingActionsProps {
	selectedOldResources: string[];
	selectedNewResources: string[];
	oldResources: MappingResource[];
	newResources: MappingResource[];
	onCreateMapping: (options?: {
		mappingDirection?: string;
		mappingType?: string;
		notes?: string;
	}) => void;
	onClearSelection: () => void;
	loading?: boolean;
}

const MAPPING_TYPES = [
	{
		value: "replacement",
		label: "Replacement",
		icon: Shuffle,
		description: "Direct resource replacement",
	},
	{
		value: "consolidation",
		label: "Consolidation",
		icon: Merge,
		description: "Multiple resources consolidated into fewer",
	},
	{
		value: "split",
		label: "Split",
		icon: Split,
		description: "One resource split into multiple",
	},
	{
		value: "dependency",
		label: "Dependency",
		icon: GitBranch,
		description: "Related/dependent resources",
	},
];

const MAPPING_DIRECTIONS = [
	{
		value: "old_to_new",
		label: "Legacy → Modern",
		description: "Traditional migration direction",
	},
	{
		value: "new_to_old",
		label: "Modern → Legacy",
		description: "Reverse migration or rollback",
	},
	{
		value: "old_to_old",
		label: "Legacy → Legacy",
		description: "Within legacy systems",
	},
	{
		value: "new_to_new",
		label: "Modern → Modern",
		description: "Between modern systems",
	},
	{
		value: "any_to_any",
		label: "Flexible",
		description: "Any direction allowed",
	},
];

const getResourceIcon = (resourceType: string): string => {
	return RESOURCE_ICONS[resourceType] || DEFAULT_RESOURCE_ICON;
};

export const BulkMappingActions: React.FC<BulkMappingActionsProps> = ({
	selectedOldResources,
	selectedNewResources,
	oldResources,
	newResources,
	onCreateMapping,
	onClearSelection,
	loading = false,
}) => {
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [notes, setNotes] = useState("");
	const [mappingType, setMappingType] = useState("replacement");
	const [mappingDirection, setMappingDirection] = useState("old_to_new");

	if (selectedOldResources.length === 0 || selectedNewResources.length === 0) {
		return null;
	}

	const selectedOldResourceObjects = oldResources.filter((r) =>
		selectedOldResources.includes(r.resourceId),
	);
	const selectedNewResourceObjects = newResources.filter((r) =>
		selectedNewResources.includes(r.resourceId),
	);

	const isMultipleOldMapping = selectedOldResources.length > 1;
	const isMultipleNewMapping = selectedNewResources.length > 1;
	const isMultipleMapping = isMultipleOldMapping || isMultipleNewMapping;

	// Check cross-type mapping across all selected resources
	const oldResourceTypes = new Set(
		selectedOldResourceObjects.map((r) => r.resourceType),
	);
	const newResourceTypes = new Set(
		selectedNewResourceObjects.map((r) => r.resourceType),
	);
	const isCrossTypeMapping =
		oldResourceTypes.size > 1 ||
		newResourceTypes.size > 1 ||
		(oldResourceTypes.size === 1 &&
			newResourceTypes.size === 1 &&
			[...oldResourceTypes][0] !== [...newResourceTypes][0]);

	const handleConfirm = () => {
		onCreateMapping({
			mappingDirection,
			mappingType,
			notes: notes.trim() || undefined,
		});
		setShowConfirmDialog(false);
		setNotes("");
		setMappingType("replacement");
		setMappingDirection("old_to_new");
	};

	const handleCancel = () => {
		setShowConfirmDialog(false);
		setNotes("");
		setMappingType("replacement");
		setMappingDirection("old_to_new");
	};

	return (
		<>
			{/* Floating Action Bar */}
			<Card className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 min-w-[600px] max-w-[90vw] transform bg-background/5 shadow-2xl backdrop-blur-sm">
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						{/* Selected Resources Preview */}
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								{selectedOldResourceObjects.length === 1 ? (
									// Single old resource
									<>
										<span className="text-lg">
											{getResourceIcon(
												selectedOldResourceObjects[0]?.resourceType || "",
											)}
										</span>
										<div className="text-sm">
											<div
												className="max-w-[120px] truncate font-medium"
												title={
													selectedOldResourceObjects[0]?.resourceName ||
													selectedOldResourceObjects[0]?.resourceId
												}
											>
												{(
													selectedOldResourceObjects[0]?.resourceName ||
													selectedOldResourceObjects[0]?.resourceId ||
													"Unknown"
												).length > 15
													? `${(selectedOldResourceObjects[0]?.resourceName || selectedOldResourceObjects[0]?.resourceId || "Unknown").substring(0, 15)}...`
													: selectedOldResourceObjects[0]?.resourceName ||
														selectedOldResourceObjects[0]?.resourceId ||
														"Unknown"}
											</div>
											<div className="text-muted-foreground text-xs">
												{selectedOldResourceObjects[0]?.resourceType}
											</div>
										</div>
									</>
								) : (
									// Multiple old resources
									<>
										<Badge variant="secondary">
											{selectedOldResources.length} source
											{selectedOldResources.length > 1 ? "s" : ""}
										</Badge>
										{selectedOldResourceObjects.slice(0, 2).map((resource) => (
											<AwsIcon
												key={resource.resourceId}
												resourceType={resource.resourceType}
												size={20}
												className="flex-shrink-0"
												fallback="lucide"
											/>
										))}
										{selectedOldResourceObjects.length > 2 && (
											<span className="text-muted-foreground text-xs">
												+{selectedOldResourceObjects.length - 2}
											</span>
										)}
									</>
								)}
							</div>

							<ArrowRight className="h-4 w-4 text-muted-foreground" />

							<div className="flex items-center gap-2">
								<Badge variant="secondary">
									{selectedNewResources.length} target
									{selectedNewResources.length > 1 ? "s" : ""}
								</Badge>
								{selectedNewResourceObjects.slice(0, 2).map((resource) => (
									<div
										key={resource.resourceId}
										className="flex items-center gap-1"
									>
										<AwsIcon
											resourceType={resource.resourceType}
											size={20}
											className="flex-shrink-0"
											fallback="lucide"
										/>
										<span
											className="max-w-[80px] truncate text-xs"
											title={resource.resourceName || resource.resourceId}
										>
											{(resource.resourceName || resource.resourceId).length >
											12
												? `${(resource.resourceName || resource.resourceId).substring(0, 12)}...`
												: resource.resourceName || resource.resourceId}
										</span>
									</div>
								))}
								{selectedNewResourceObjects.length > 2 && (
									<span className="text-muted-foreground text-xs">
										+{selectedNewResourceObjects.length - 2} more
									</span>
								)}
							</div>
						</div>

						{/* Warning Indicators */}
						<div className="flex items-center gap-2">
							{isMultipleOldMapping && isMultipleNewMapping && (
								<Badge variant="outline" className="text-xs">
									N:M Mapping
								</Badge>
							)}
							{isMultipleOldMapping && !isMultipleNewMapping && (
								<Badge variant="outline" className="text-xs">
									N:1 Mapping
								</Badge>
							)}
							{!isMultipleOldMapping && isMultipleNewMapping && (
								<Badge variant="outline" className="text-xs">
									1:N Mapping
								</Badge>
							)}
							{isCrossTypeMapping && (
								<Badge
									variant="outline"
									className="border-orange-300 text-orange-600 text-xs"
								>
									Cross-Type
								</Badge>
							)}
						</div>

						{/* Actions */}
						<div className="ml-auto flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearSelection}
								className="h-8"
							>
								<X className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								onClick={() => setShowConfirmDialog(true)}
								disabled={loading}
								className="flex h-8 items-center gap-2"
							>
								<Link className="h-4 w-4" />
								Create{" "}
								{selectedOldResources.length * selectedNewResources.length}{" "}
								Mapping
								{selectedOldResources.length * selectedNewResources.length > 1
									? "s"
									: ""}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Confirmation Dialog */}
			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent className="max-w-2xl bg-secondary/40 backdrop-blur-lg ">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Link className="h-5 w-5 text-primary" />
							Confirm Resource Mapping
						</DialogTitle>
						<DialogDescription>
							You are about to create{" "}
							{selectedOldResources.length * selectedNewResources.length}{" "}
							mapping
							{selectedOldResources.length * selectedNewResources.length > 1
								? "s"
								: ""}{" "}
							between {selectedOldResources.length} old resource
							{selectedOldResources.length > 1 ? "s" : ""} and{" "}
							{selectedNewResources.length} new resource
							{selectedNewResources.length > 1 ? "s" : ""}.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 opacity-80">
						{/* Mapping Preview */}
						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="mb-3 font-medium text-sm">Mapping Details:</div>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="flex flex-1 items-center gap-2">
										<div className="font-medium text-sm">
											{selectedOldResources.length} source resource
											{selectedOldResources.length > 1 ? "s" : ""}
										</div>
									</div>
									<ArrowRight className="h-4 w-4 text-muted-foreground" />
									<div className="font-medium text-sm">
										{selectedNewResources.length} target resource
										{selectedNewResources.length > 1 ? "s" : ""}
									</div>
								</div>

								{/* Old Resources */}
								<div className="space-y-2">
									<div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Source Resources:
									</div>
									{selectedOldResourceObjects.map((resource) => (
										<div
											key={resource.resourceId}
											className="flex items-center gap-2 pl-2 text-sm"
										>
											<span>{getResourceIcon(resource.resourceType)}</span>
											<div className="min-w-0 flex-1">
												<div
													className="truncate font-medium"
													title={resource.resourceName || resource.resourceId}
												>
													{(resource.resourceName || resource.resourceId)
														.length > 35
														? `${(resource.resourceName || resource.resourceId).substring(0, 35)}...`
														: resource.resourceName || resource.resourceId}
												</div>
												<div className="text-muted-foreground text-xs">
													{resource.resourceType} • {resource.region}
												</div>
											</div>
										</div>
									))}
								</div>

								{/* New Resources */}
								<div className="space-y-2">
									<div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
										Target Resources:
									</div>
									{selectedNewResourceObjects.map((resource) => (
										<div
											key={resource.resourceId}
											className="flex items-center gap-2 pl-2 text-sm"
										>
											<span>{getResourceIcon(resource.resourceType)}</span>
											<div className="min-w-0 flex-1">
												<div
													className="truncate font-medium"
													title={resource.resourceName || resource.resourceId}
												>
													{(resource.resourceName || resource.resourceId)
														.length > 35
														? `${(resource.resourceName || resource.resourceId).substring(0, 35)}...`
														: resource.resourceName || resource.resourceId}
												</div>
												<div className="text-muted-foreground text-xs">
													{resource.resourceType} • {resource.region}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Warnings */}
						{(isMultipleMapping || isCrossTypeMapping) && (
							<div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50/90 p-3">
								<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
								<div className="text-sm">
									{isMultipleOldMapping && isMultipleNewMapping && (
										<div className="mb-1 text-yellow-800">
											<strong>Many-to-Many Mapping:</strong> This will create
											{selectedOldResources.length *
												selectedNewResources.length}{" "}
											mappings between {selectedOldResources.length} old
											resources and {selectedNewResources.length} new resources.
										</div>
									)}
									{isMultipleOldMapping && !isMultipleNewMapping && (
										<div className="mb-1 text-yellow-800">
											<strong>Many-to-One Mapping:</strong> This will create
											multiple mappings from {selectedOldResources.length} old
											resources to 1 new resource.
										</div>
									)}
									{!isMultipleOldMapping && isMultipleNewMapping && (
										<div className="mb-1 text-yellow-800">
											<strong>One-to-Many Mapping:</strong> This will create
											multiple mappings from 1 old resource to{" "}
											{selectedNewResources.length} new resources.
										</div>
									)}
									{isCrossTypeMapping && (
										<div className="text-yellow-800">
											<strong>Cross-Type Mapping:</strong> You are mapping
											between different resource types. Please ensure this is
											intentional.
										</div>
									)}
								</div>
							</div>
						)}

						{/* Mapping Configuration */}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label htmlFor="mapping-type" className="font-medium text-sm">
									Mapping Type
								</Label>
								<Select value={mappingType} onValueChange={setMappingType}>
									<SelectTrigger className="mt-2">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MAPPING_TYPES.map((type) => {
											const IconComponent = type.icon;
											return (
												<SelectItem key={type.value} value={type.value}>
													<div className="flex items-center gap-2">
														<IconComponent className="h-4 w-4" />
														<div>
															<div className="font-medium">{type.label}</div>
														</div>
													</div>
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label
									htmlFor="mapping-direction"
									className="font-medium text-sm"
								>
									Mapping Direction
								</Label>
								<Select
									value={mappingDirection}
									onValueChange={setMappingDirection}
								>
									<SelectTrigger className="mt-2">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MAPPING_DIRECTIONS.map((direction) => (
											<SelectItem key={direction.value} value={direction.value}>
												<div>
													<div className="font-medium">{direction.label}</div>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Notes */}
						<div>
							<Label htmlFor="mapping-notes" className="font-medium text-sm">
								Notes (Optional)
							</Label>
							<Textarea
								id="mapping-notes"
								placeholder="Add any notes about this mapping..."
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								className="mt-2 min-h-[80px]"
								maxLength={500}
							/>
							<div className="mt-1 text-muted-foreground text-xs">
								{notes.length}/500 characters
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={handleCancel}>
							Cancel
						</Button>
						<Button onClick={handleConfirm} disabled={loading}>
							<Save className="mr-2 h-4 w-4" />
							Confirm{" "}
							{selectedOldResources.length * selectedNewResources.length}{" "}
							Mapping
							{selectedOldResources.length * selectedNewResources.length > 1
								? "s"
								: ""}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
