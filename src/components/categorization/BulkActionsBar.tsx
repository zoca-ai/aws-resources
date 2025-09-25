import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { BulkActionsBarProps, Category } from "@/lib/types/categorization";
import type React from "react";

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
	selectedCount,
	onClearSelection,
	onBulkCategorize,
}) => {
	if (selectedCount === 0) {
		return null;
	}

	const handleBulkCategorize = async (category: Category) => {
		await onBulkCategorize(category);
	};

	return (
		<Card className="-translate-x-1/2 fixed bottom-6 left-1/2 z-50 min-w-[600px] max-w-[90vw] transform bg-background/5 shadow-2xl backdrop-blur-sm">
			<CardContent className="">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Checkbox checked={true} disabled />
							<span className="font-medium">
								{selectedCount} resource{selectedCount !== 1 ? "s" : ""}{" "}
								selected
							</span>
						</div>
						<Separator orientation="vertical" className="h-6" />
						<Button variant="outline" size="sm" onClick={onClearSelection}>
							Clear Selection
						</Button>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							onClick={() => handleBulkCategorize("old")}
						>
							Mark as Legacy
						</Button>
						<Button onClick={() => handleBulkCategorize("new")}>
							Mark as Modern
						</Button>
						<Button
							variant="secondary"
							onClick={() => handleBulkCategorize("uncategorized")}
						>
							Uncategorize
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
