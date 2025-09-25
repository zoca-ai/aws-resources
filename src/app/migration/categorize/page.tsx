"use client";

import {
	BulkActionsBar,
	CategoryColumn,
	GlobalActions,
	ProgressHeader,
} from "@/components/categorization";
import { MigrationNav } from "@/components/migration/MigrationNav";
import { Button } from "@/components/ui/button";
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
import { useCategorization } from "@/hooks/use-categorization";
import {
	BULK_ACTION_CATEGORIES,
	CATEGORY_CONFIGS,
} from "@/lib/constants/categorization";
import type { Category } from "@/lib/types/categorization";
import { Save } from "lucide-react";
import React from "react";

export default function CategorizePage() {
	const categorization = useCategorization();

	const handleBulkCategorize = async (category: Category) => {
		if (categorization.globalState.selectedResources.size === 0) {
			return;
		}

		// Call bulk categorize with the specific category
		await categorization.handleBulkCategorize(
			category,
			`Bulk categorized as ${category}`,
		);
	};

	const handleSortChange = (
		field: "name" | "type" | "region",
		order: "asc" | "desc",
	) => {
		categorization.setSortBy(field);
		categorization.setSortOrder(order);
	};

	return (
		<div className="min-h-screen space-y-6">
			{/* Navigation */}
			<MigrationNav />

			{/* Progress Header */}
			<ProgressHeader stats={categorization.stats} />

			{/* Global Actions */}
			<GlobalActions
				sortBy={categorization.globalState.sortBy}
				sortOrder={categorization.globalState.sortOrder}
				onSortChange={handleSortChange}
				onClearAllFilters={categorization.clearAllFilters}
				selectedCount={categorization.globalState.selectedResources.size}
				onBulkActionClick={() => categorization.setBulkActionDialog(true)}
			/>

			{/* Categorization Interface */}
			<div className="grid h-screen gap-6 py-4 lg:grid-cols-3">
				{CATEGORY_CONFIGS.map((config) => (
					<CategoryColumn
						key={config.key}
						category={config.key}
						title={config.title}
						description={config.description}
						icon={config.icon}
						count={categorization.filteredResources[config.key].length}
						searchTerm={categorization.filters[config.key].search}
						onSearchChange={(value) =>
							categorization.updateFilter(config.key, "search", value)
						}
						typeFilter={categorization.filters[config.key].type}
						onTypeFilterChange={(value) =>
							categorization.updateFilter(config.key, "type", value)
						}
						regionFilter={categorization.filters[config.key].region}
						onRegionFilterChange={(value) =>
							categorization.updateFilter(config.key, "region", value)
						}
						uniqueTypes={categorization.uniqueTypes}
						uniqueRegions={categorization.uniqueRegions}
						onClearFilters={() => categorization.clearColumnFilters(config.key)}
						resources={categorization.filteredResources[config.key]}
						selectedResources={categorization.globalState.selectedResources}
						onResourceSelect={categorization.toggleResourceSelection}
						onResourceCategorize={categorization.handleResourceCategorize}
						onSelectAll={() =>
							categorization.selectAll(
								categorization.filteredResources[config.key],
							)
						}
						onDeselectAll={() =>
							categorization.deselectAll(
								categorization.filteredResources[config.key],
							)
						}
					/>
				))}
			</div>

			{/* Bulk Actions Bar */}
			<BulkActionsBar
				selectedCount={categorization.globalState.selectedResources.size}
				onClearSelection={() => categorization.setSelectedResources(new Set())}
				onBulkCategorize={handleBulkCategorize}
			/>

			{/* Bulk Action Dialog */}
			<Dialog
				open={categorization.globalState.bulkActionDialog}
				onOpenChange={categorization.setBulkActionDialog}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bulk Categorize Resources</DialogTitle>
						<DialogDescription>
							Categorize {categorization.globalState.selectedResources.size}{" "}
							selected resources
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="category">Category</Label>
							<Select
								value={categorization.globalState.bulkActionData.category}
								onValueChange={(value) =>
									categorization.setBulkActionData({
										...categorization.globalState.bulkActionData,
										category: value as Category,
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{BULK_ACTION_CATEGORIES.map(({ value, label }) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								placeholder="Add notes about this categorization..."
								value={categorization.globalState.bulkActionData.notes}
								onChange={(e) =>
									categorization.setBulkActionData({
										...categorization.globalState.bulkActionData,
										notes: e.target.value,
									})
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => categorization.setBulkActionDialog(false)}
						>
							Cancel
						</Button>
						<Button onClick={() => categorization.handleBulkCategorize()}>
							<Save className="mr-2 h-4 w-4" />
							Categorize {categorization.globalState.selectedResources.size}{" "}
							Resources
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
