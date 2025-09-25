"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

interface EmptyStateProps {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	className?: string;
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"fade-in-50 flex min-h-[400px] animate-in flex-col items-center justify-center rounded-md border border-dashed p-8 text-center",
				className,
			)}
		>
			{Icon && (
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
					<Icon className="h-10 w-10 text-muted-foreground" />
				</div>
			)}
			<h3 className="mt-4 font-semibold text-lg">{title}</h3>
			{description && (
				<p className="mt-2 mb-4 text-muted-foreground text-sm">{description}</p>
			)}
			{action && (
				<Button size="sm" onClick={action.onClick}>
					{action.label}
				</Button>
			)}
		</div>
	);
}
