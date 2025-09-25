import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProgressHeaderProps } from "@/lib/types/categorization";
import type React from "react";

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({ stats }) => {
	const progressPercentage = stats
		? Math.round(
				((stats.old + stats.new) /
					(stats.old + stats.new + stats.uncategorized)) *
					100,
			) || 0
		: 0;

	const categorized = (stats?.old || 0) + (stats?.new || 0);
	const remaining = stats?.uncategorized || 0;

	return (
		<div className="space-y-4">
			<Card>
				<CardContent className="pt-6">
					<Progress value={progressPercentage} className="h-3" />
					<div className="mt-2 flex justify-between text-muted-foreground text-sm">
						<span>{categorized} categorized</span>
						<span>{remaining} remaining</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
