import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants/categorization";
import type {
	GlobalActionsProps,
	SortField,
	SortOrder,
} from "@/lib/types/categorization";
import { RotateCcw, Zap } from "lucide-react";
import type React from "react";

export const GlobalActions: React.FC<GlobalActionsProps> = ({
	sortBy,
	sortOrder,
	onSortChange,
	onClearAllFilters,
	selectedCount,
	onBulkActionClick,
}) => {
	const handleSortChange = (value: string) => {
		const [field, order] = value.split("-") as [SortField, SortOrder];
		onSortChange(field, order);
	};

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Select
							value={`${sortBy}-${sortOrder}`}
							onValueChange={handleSortChange}
						>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Sort By" />
							</SelectTrigger>
							<SelectContent>
								{SORT_OPTIONS.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={onClearAllFilters} size="sm">
							<RotateCcw className="mr-2 h-4 w-4" />
							Clear All Filters
						</Button>
						{selectedCount > 0 && (
							<Button onClick={onBulkActionClick} size="sm">
								<Zap className="mr-2 h-4 w-4" />
								Bulk Action ({selectedCount})
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
