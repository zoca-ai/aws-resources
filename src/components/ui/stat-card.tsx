"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

interface StatCardProps {
	title: string;
	value: string | number;
	description?: string;
	icon?: LucideIcon;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
	loading?: boolean;
}

export function StatCard({
	title,
	value,
	description,
	icon: Icon,
	trend,
	className,
	loading = false,
}: StatCardProps) {
	if (loading) {
		return (
			<Card className={className}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<Skeleton className="h-4 w-[100px]" />
					<Skeleton className="h-4 w-4" />
				</CardHeader>
				<CardContent>
					<Skeleton className="mb-1 h-7 w-[120px]" />
					<Skeleton className="h-3 w-[80px]" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">{title}</CardTitle>
				{Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl">{value}</div>
				{(description || trend) && (
					<div className="flex items-center space-x-2">
						{trend && (
							<span
								className={cn(
									"font-medium text-xs",
									trend.isPositive ? "text-green-500" : "text-red-500",
								)}
							>
								{trend.isPositive ? "+" : "-"}
								{Math.abs(trend.value)}%
							</span>
						)}
						{description && (
							<p className="text-muted-foreground text-xs">{description}</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface StatGridProps {
	children: React.ReactNode;
	className?: string;
}

export function StatGrid({ children, className }: StatGridProps) {
	return (
		<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
			{children}
		</div>
	);
}
