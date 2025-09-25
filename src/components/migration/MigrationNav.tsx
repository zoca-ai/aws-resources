"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRightLeft, ChevronRight, Filter, List } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MigrationNavProps {
	stats?: {
		categorized?: number;
		pending?: number;
		mappings?: number;
	};
}

export function MigrationNav({ stats }: MigrationNavProps) {
	const pathname = usePathname();

	const navItems = [
		{
			href: "/migration/categorize",
			label: "Categorize",
			description: "Classify resources as old or new",
			icon: Filter,
			count: stats?.categorized,
			isActive: pathname === "/migration/categorize",
		},
		{
			href: "/migration/map",
			label: "Map Resources",
			description: "Create mappings between resources",
			icon: ArrowRightLeft,
			count: stats?.pending,
			isActive: pathname === "/migration/map",
		},
		{
			href: "/migration/mappings",
			label: "View Mappings",
			description: "Manage existing mappings",
			icon: List,
			count: stats?.mappings,
			isActive: pathname === "/migration/mappings",
		},
	];

	return (
		<Card>
			<CardContent className="">
				<div className="flex items-center gap-2 overflow-x-auto">
					{navItems.map((item, index) => {
						const Icon = item.icon;
						const isLast = index === navItems.length - 1;

						return (
							<div
								key={item.href}
								className="flex flex-1 flex-shrink-0 items-center gap-2"
							>
								<Link href={item.href} className="w-full">
									<Button
										variant={item.isActive ? "default" : "outline"}
										size="sm"
										className="flex h-auto w-full items-center justify-start gap-4 px-4 py-2"
									>
										<Icon className="h-4 w-4" />
										<div className="text-left">
											<div className="flex items-center gap-2 font-medium">
												{item.label}
												{item.count !== undefined && (
													<Badge
														variant={item.isActive ? "secondary" : "outline"}
														className="text-xs"
													>
														{item.count}
													</Badge>
												)}
											</div>
										</div>
									</Button>
								</Link>

								{!isLast && (
									<ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
