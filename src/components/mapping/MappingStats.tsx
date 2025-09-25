import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { MappingStatsProps } from "@/lib/types/mapping";
import { cn } from "@/lib/utils";
import {
	BarChart3,
	Clock,
	Link,
	Link2Off,
	Target,
	TrendingUp,
} from "lucide-react";
import type React from "react";

export const MappingStats: React.FC<MappingStatsProps> = ({
	stats,
	loading = false,
}) => {
	if (loading) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, idx) => (
					<Card key={idx}>
						<CardContent className="p-4">
							<Skeleton className="mb-2 h-8 w-16" />
							<Skeleton className="h-4 w-24" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardContent className="p-4 text-center text-muted-foreground">
						<BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
						<div className="text-sm">No data available</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const mappingProgress =
		stats.total > 0 ? (stats.mapped / stats.total) * 100 : 0;
	const pendingProgress =
		stats.total > 0 ? (stats.pending / stats.total) * 100 : 0;

	const statCards = [
		{
			title: "Total Resources",
			value: stats.total,
			icon: Target,
			bgColor: "bg-blue-50",
			borderColor: "border-blue-200",
		},
		{
			title: "Mapped",
			value: stats.mapped,
			icon: Link,
			bgColor: "bg-green-50",
			borderColor: "border-green-200",
			percentage: mappingProgress,
		},
		{
			title: "Unmapped",
			value: stats.unmapped,
			icon: Link2Off,
			color: "text-red-600",
			bgColor: "bg-red-50",
			borderColor: "border-red-200",
		},
		{
			title: "Pending",
			value: stats.pending,
			icon: Clock,
			color: "text-yellow-600",
			bgColor: "bg-yellow-50",
			borderColor: "border-yellow-200",
			percentage: pendingProgress,
		},
	];

	return (
		<div className="space-y-4">
			{/* Main Stats */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statCards.map((stat) => {
					const Icon = stat.icon;
					return (
						<Card
							key={stat.title}
							className={cn("border-l-4", stat.borderColor)}
						>
							<CardContent className={cn("p-4", stat.bgColor)}>
								<div className="flex items-center justify-between">
									<div>
										<div className={cn("font-bold text-2xl", stat.color)}>
											{stat.value.toLocaleString()}
										</div>
										<div className="text-muted-foreground text-sm">
											{stat.title}
										</div>
										{stat.percentage !== undefined && (
											<div className="mt-1 text-muted-foreground text-xs">
												{stat.percentage.toFixed(1)}% of total
											</div>
										)}
									</div>
									<Icon className={cn("h-8 w-8", stat.color)} />
								</div>
								{stat.percentage !== undefined && (
									<div className="mt-3">
										<Progress value={stat.percentage} className="h-2" />
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Progress Overview */}
			<Card>
				<CardContent className="p-4">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="flex items-center gap-2 font-semibold text-lg">
							<TrendingUp className="h-5 w-5" />
							Mapping Progress
						</h3>
						<Badge variant="outline">
							{mappingProgress.toFixed(1)}% Complete
						</Badge>
					</div>
					<div className="space-y-3">
						<div>
							<div className="mb-1 flex justify-between text-sm">
								<span>Mapped Resources</span>
								<span>
									{stats.mapped} / {stats.total}
								</span>
							</div>
							<Progress value={mappingProgress} className="h-3" />
						</div>
						{stats.pending > 0 && (
							<div>
								<div className="mb-1 flex justify-between text-sm">
									<span className="text-yellow-600">Pending Mappings</span>
									<span>{stats.pending} awaiting review</span>
								</div>
								<Progress value={pendingProgress} className="h-2" />
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Confidence Breakdown */}
			{stats.confidence &&
				stats.confidence.high + stats.confidence.medium + stats.confidence.low >
					0 && (
					<Card>
						<CardContent className="p-4">
							<h3 className="mb-3 font-semibold text-lg">Mapping Confidence</h3>
							<div className="grid grid-cols-3 gap-4">
								<div className="text-center">
									<div className="font-bold text-2xl text-green-600">
										{stats.confidence.high}
									</div>
									<div className="text-muted-foreground text-sm">
										High (≥80%)
									</div>
									<div className="mt-2 h-2 w-full rounded-full bg-green-100">
										<div
											className="h-full rounded-full bg-green-500"
											style={{
												width: `${stats.mapped > 0 ? (stats.confidence.high / stats.mapped) * 100 : 0}%`,
											}}
										/>
									</div>
								</div>
								<div className="text-center">
									<div className="font-bold text-2xl text-yellow-600">
										{stats.confidence.medium}
									</div>
									<div className="text-muted-foreground text-sm">
										Medium (60-79%)
									</div>
									<div className="mt-2 h-2 w-full rounded-full bg-yellow-100">
										<div
											className="h-full rounded-full bg-yellow-500"
											style={{
												width: `${stats.mapped > 0 ? (stats.confidence.medium / stats.mapped) * 100 : 0}%`,
											}}
										/>
									</div>
								</div>
								<div className="text-center">
									<div className="font-bold text-2xl text-red-600">
										{stats.confidence.low}
									</div>
									<div className="text-muted-foreground text-sm">
										Low (&lt;60%)
									</div>
									<div className="mt-2 h-2 w-full rounded-full bg-red-100">
										<div
											className="h-full rounded-full bg-red-500"
											style={{
												width: `${stats.mapped > 0 ? (stats.confidence.low / stats.mapped) * 100 : 0}%`,
											}}
										/>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
		</div>
	);
};
