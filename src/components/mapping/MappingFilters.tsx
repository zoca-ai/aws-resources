import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MAPPING_STATUS_OPTIONS } from "@/lib/constants/mapping";
import type { FilterState, MappingFiltersProps } from "@/lib/types/mapping";
import { Filter, Search, X } from "lucide-react";
import type React from "react";

export const MappingFilters: React.FC<MappingFiltersProps> = ({
	filters,
	onFilterChange,
	onClearFilters,
	uniqueTypes,
	uniqueRegions,
}) => {
	const hasActiveFilters =
		filters.search !== "" ||
		filters.type !== "all" ||
		filters.region !== "all" ||
		filters.mappingStatus !== "all";

	const handleFilterChange = (field: keyof FilterState, value: string) => {
		onFilterChange(field, value);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters
					</div>
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onClearFilters}
							className="text-muted-foreground hover:text-foreground"
						>
							<X className="mr-1 h-4 w-4" />
							Clear All
						</Button>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
					{/* Search Input */}
					<div className="relative lg:col-span-2">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Search resources..."
							value={filters.search}
							onChange={(e) => handleFilterChange("search", e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Resource Type Filter */}
					<Select
						value={filters.type}
						onValueChange={(value) => handleFilterChange("type", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Resource Type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{uniqueTypes.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Region Filter */}
					<Select
						value={filters.region}
						onValueChange={(value) => handleFilterChange("region", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Region" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Regions</SelectItem>
							{uniqueRegions.map((region) => (
								<SelectItem key={region} value={region}>
									{region}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Mapping Status Filter */}
					<Select
						value={filters.mappingStatus}
						onValueChange={(value) =>
							handleFilterChange("mappingStatus", value)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							{MAPPING_STATUS_OPTIONS.map((status) => (
								<SelectItem key={status.value} value={status.value}>
									{status.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Active Filters Display */}
				{hasActiveFilters && (
					<div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
						{filters.search && (
							<div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-sm">
								<span>Search: &quot;{filters.search}&quot;</span>
								<button
									onClick={() => handleFilterChange("search", "")}
									className="rounded p-0.5 hover:bg-primary/20"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						)}

						{filters.type !== "all" && (
							<div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-sm">
								<span>Type: {filters.type}</span>
								<button
									onClick={() => handleFilterChange("type", "all")}
									className="rounded p-0.5 hover:bg-primary/20"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						)}

						{filters.region !== "all" && (
							<div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-sm">
								<span>Region: {filters.region}</span>
								<button
									onClick={() => handleFilterChange("region", "all")}
									className="rounded p-0.5 hover:bg-primary/20"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						)}

						{filters.mappingStatus !== "all" && (
							<div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary text-sm">
								<span>
									Status:{" "}
									{
										MAPPING_STATUS_OPTIONS.find(
											(s) => s.value === filters.mappingStatus,
										)?.label
									}
								</span>
								<button
									onClick={() => handleFilterChange("mappingStatus", "all")}
									className="rounded p-0.5 hover:bg-primary/20"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
