import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { formatResourceType } from "@/lib/format-utils";
import type { ColumnFiltersProps } from "@/lib/types/categorization";
import { RotateCcw, Search } from "lucide-react";
import type React from "react";

export const ColumnFilters: React.FC<ColumnFiltersProps> = ({
	searchTerm,
	onSearchChange,
	typeFilter,
	onTypeFilterChange,
	regionFilter,
	onRegionFilterChange,
	uniqueTypes,
	uniqueRegions,
	onClearFilters,
	placeholder = "Search resources...",
}) => {
	const hasActiveFilters =
		searchTerm !== "" || typeFilter !== "all" || regionFilter !== "all";

	return (
		<div className="space-y-3 border-b bg-muted/30 p-3">
			{/* Search */}
			<div className="relative">
				<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder={placeholder}
					value={searchTerm}
					onChange={(e) => onSearchChange(e.target.value)}
					className="h-9 pl-8"
				/>
			</div>

			{/* Filters Row */}
			<div className="flex gap-2">
				<Select value={typeFilter} onValueChange={onTypeFilterChange}>
					<SelectTrigger className="h-8 flex-1 text-xs">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						{uniqueTypes.map((type) => (
							<SelectItem key={type} value={type} className="text-xs">
								{formatResourceType(type)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={regionFilter} onValueChange={onRegionFilterChange}>
					<SelectTrigger className="h-8 flex-1 text-xs">
						<SelectValue placeholder="Region" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Regions</SelectItem>
						{uniqueRegions.map((region) => (
							<SelectItem key={region} value={region} className="text-xs">
								{region}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onClearFilters}
						className="h-8 px-2"
					>
						<RotateCcw className="h-3 w-3" />
					</Button>
				)}
			</div>

			{/* Active Filters Display */}
			{hasActiveFilters && (
				<div className="flex flex-wrap gap-1">
					{searchTerm && (
						<Badge variant="secondary" className="text-xs">
							Search: {searchTerm}
						</Badge>
					)}
					{typeFilter !== "all" && (
						<Badge variant="secondary" className="text-xs">
							Type: {formatResourceType(typeFilter)}
						</Badge>
					)}
					{regionFilter !== "all" && (
						<Badge variant="secondary" className="text-xs">
							Region: {regionFilter}
						</Badge>
					)}
				</div>
			)}
		</div>
	);
};
