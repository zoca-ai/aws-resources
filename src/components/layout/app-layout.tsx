"use client";

import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	ChevronLeft,
	ChevronRight,
	Cloud,
	Database,
	GitBranch,
	LayoutDashboard,
	LogOut,
	Server,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface AppLayoutProps {
	children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const pathname = usePathname();

	const navItems = [
		{
			title: "Dashboard",
			href: "/",
			icon: <LayoutDashboard className="h-4 w-4" />,
			active: pathname === "/",
		},
		{
			title: "Collect",
			href: "/collect",
			icon: <Database className="h-4 w-4" />,
			active: pathname.startsWith("/collect"),
		},
		{
			title: "Resources",
			href: "/resources",
			icon: <Server className="h-4 w-4" />,
			active: pathname.startsWith("/resources"),
		},
		{
			title: "Migration",
			href: "/migration/categorize",
			icon: <GitBranch className="h-4 w-4" />,
			active: pathname.startsWith("/migration"),
		},
	];

	return (
		<div className="flex h-screen bg-background">
			{/* Sidebar */}
			<div
				className={cn(
					"border-r bg-card transition-all duration-300",
					isCollapsed ? "w-16" : "w-64",
				)}
			>
				<div className="flex h-full flex-col">
					{/* Header */}
					<div className="border-b p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<Cloud className="h-6 w-6 text-primary" />
								{!isCollapsed && (
									<span className="font-semibold text-lg">Resources</span>
								)}
							</div>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								onClick={() => setIsCollapsed(!isCollapsed)}
							>
								{isCollapsed ? (
									<ChevronRight className="h-4 w-4" />
								) : (
									<ChevronLeft className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>

					{/* Navigation */}
					<nav className="flex-1 p-4">
						<div className="space-y-1">
							{navItems.map((item) => (
								<a key={item.href} href={item.href} className="block">
									<Button
										variant={item.active ? "secondary" : "ghost"}
										className={cn(
											"w-full justify-start",
											isCollapsed && "justify-center",
										)}
									>
										{item.icon}
										{!isCollapsed && <span className="ml-2">{item.title}</span>}
									</Button>
								</a>
							))}
						</div>
					</nav>

					{/* User Menu */}
					<div className="space-y-2 border-t p-4">
						<UserMenu isCollapsed={isCollapsed} />
						{!isCollapsed && (
							<Button
								variant="ghost"
								size="sm"
								className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
								onClick={async () => {
									const { signOut } = await import("next-auth/react");
									await signOut({ callbackUrl: "/auth/signin" });
								}}
							>
								<LogOut className="mr-2 h-4 w-4" />
								<span>Sign out</span>
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				{/* Page Content */}
				<main className="flex-1 overflow-auto">
					<div className="h-full p-6">{children}</div>
				</main>
			</div>
		</div>
	);
}
