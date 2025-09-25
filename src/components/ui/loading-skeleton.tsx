"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import * as React from "react";

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
	className?: string;
}

export function TableSkeleton({
	rows = 5,
	columns = 4,
	className,
}: TableSkeletonProps) {
	return (
		<div className={cn("rounded-md border", className)}>
			<div className="p-4">
				<div className="space-y-3">
					{/* Header */}
					<div className="flex gap-4">
						{Array.from({ length: columns }).map((_, i) => (
							<Skeleton key={i} className="h-8 flex-1" />
						))}
					</div>
					{/* Rows */}
					{Array.from({ length: rows }).map((_, rowIndex) => (
						<div key={rowIndex} className="flex gap-4">
							{Array.from({ length: columns }).map((_, colIndex) => (
								<Skeleton key={colIndex} className="h-12 flex-1" />
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

interface CardSkeletonProps {
	className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-[140px]" />
				<Skeleton className="h-4 w-[200px]" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-32 w-full" />
			</CardContent>
		</Card>
	);
}

interface ChartSkeletonProps {
	className?: string;
	height?: number;
}

export function ChartSkeleton({ className, height = 350 }: ChartSkeletonProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<Skeleton className="h-5 w-[140px]" />
				<Skeleton className="h-4 w-[200px]" />
			</CardHeader>
			<CardContent>
				<Skeleton className={"w-full"} style={{ height: `${height}px` }} />
			</CardContent>
		</Card>
	);
}

interface ListSkeletonProps {
	items?: number;
	className?: string;
}

export function ListSkeleton({ items = 5, className }: ListSkeletonProps) {
	return (
		<div className={cn("space-y-3", className)}>
			{Array.from({ length: items }).map((_, i) => (
				<div key={i} className="flex items-center space-x-4">
					<Skeleton className="h-12 w-12 rounded-full" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-[250px]" />
						<Skeleton className="h-4 w-[200px]" />
					</div>
				</div>
			))}
		</div>
	);
}

interface PageSkeletonProps {
	className?: string;
}

export function PageSkeleton({ className }: PageSkeletonProps) {
	return (
		<div className={cn("space-y-6 p-8", className)}>
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-[200px]" />
				<Skeleton className="h-4 w-[350px]" />
			</div>

			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader className="pb-2">
							<Skeleton className="h-4 w-[100px]" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-8 w-[60px]" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Main Content */}
			<div className="grid gap-4 md:grid-cols-2">
				<ChartSkeleton />
				<CardSkeleton />
			</div>

			{/* Table */}
			<TableSkeleton />
		</div>
	);
}
