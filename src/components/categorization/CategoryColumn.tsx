import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	EMPTY_STATE_MESSAGES,
	SCROLL_AREA_HEIGHT,
} from "@/lib/constants/categorization";
import type { Resource } from "@/lib/types/categorization";
import { CheckCircle2 } from "lucide-react";
import type React from "react";
import { ColumnFilters } from "./ColumnFilters";
import { ResourceCard } from "./ResourceCard";

interface ExtendedCategoryColumnProps {
	category: "old" | "new" | "uncategorized";
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	count: number;

	// Filter props
	searchTerm: string;
	onSearchChange: (value: string) => void;
	typeFilter: string;
	onTypeFilterChange: (value: string) => void;
	regionFilter: string;
	onRegionFilterChange: (value: string) => void;
	uniqueTypes: string[];
	uniqueRegions: string[];
	onClearFilters: () => void;

	// Resource props
	resources: Resource[];
	selectedResources: Set<string>;
	onResourceSelect: (id: string) => void;
	onResourceCategorize: (
		resourceId: string,
		newCategory: "old" | "new" | "uncategorized",
	) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
}

export const CategoryColumn: React.FC<ExtendedCategoryColumnProps> = ({
	category,
	title,
	description,
	icon: Icon,
	count,
	searchTerm,
	onSearchChange,
	typeFilter,
	onTypeFilterChange,
	regionFilter,
	onRegionFilterChange,
	uniqueTypes,
	uniqueRegions,
	onClearFilters,
	resources,
	selectedResources,
	onResourceSelect,
	onResourceCategorize,
	onSelectAll,
	onDeselectAll,
}) => {
	const emptyStateConfig = EMPTY_STATE_MESSAGES[category];
	const hasFilters =
		searchTerm !== "" || typeFilter !== "all" || regionFilter !== "all";
	const placeholder = `Search ${title.toLowerCase()}...`;

	return (
		<Card className="transition-all duration-200">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Icon className="h-5 w-5" />
						{title}
						<Badge variant="outline" className="ml-2">
							{count}
						</Badge>
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent>
				<ColumnFilters
					searchTerm={searchTerm}
					onSearchChange={onSearchChange}
					typeFilter={typeFilter}
					onTypeFilterChange={onTypeFilterChange}
					regionFilter={regionFilter}
					onRegionFilterChange={onRegionFilterChange}
					uniqueTypes={uniqueTypes}
					uniqueRegions={uniqueRegions}
					onClearFilters={onClearFilters}
					placeholder={placeholder}
				/>

				<div className="p-3">
					{/* Selection Controls */}
					{resources.length > 0 && (
						<div className="mb-3 flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={onSelectAll}
								className="h-7 text-xs"
							>
								Select All
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={onDeselectAll}
								className="h-7 text-xs"
							>
								Deselect
							</Button>
						</div>
					)}

					{/* Resource List */}
					<ScrollArea style={{ height: SCROLL_AREA_HEIGHT }}>
						<div className="space-y-3">
							{resources.map((resource) => (
								<ResourceCard
									key={resource.resourceId}
									resource={resource}
									isSelected={selectedResources.has(resource.resourceId)}
									onSelect={onResourceSelect}
									category={category}
									onCategorize={onResourceCategorize}
								/>
							))}

							{/* Empty State */}
							{resources.length === 0 && (
								<div className="py-12 text-center text-muted-foreground">
									{category === "uncategorized" ? (
										<CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500 opacity-50" />
									) : (
										<Icon className="mx-auto mb-4 h-12 w-12 opacity-50" />
									)}
									<p>{emptyStateConfig.title}</p>
									{category === "uncategorized" ? (
										<>
											<p className="mt-2 text-xs">
												{emptyStateConfig.subtitle}
											</p>
											{hasFilters && "filtered" in emptyStateConfig && (
												<p className="mt-1 text-muted-foreground text-xs">
													{emptyStateConfig.filtered}
												</p>
											)}
										</>
									) : (
										hasFilters && (
											<p className="mt-1 text-xs">
												{emptyStateConfig.subtitle}
											</p>
										)
									)}
								</div>
							)}
						</div>
					</ScrollArea>
				</div>
			</CardContent>
		</Card>
	);
};
