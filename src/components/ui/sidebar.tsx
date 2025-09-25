"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import * as React from "react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
	isCollapsed?: boolean;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
	({ className, isCollapsed = false, children, ...props }, ref) => {
		return (
			<>
				{/* Mobile Sidebar */}
				<div className="lg:hidden">
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="fixed top-4 left-4 z-40"
							>
								<Menu className="h-5 w-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="left" className="w-72 p-0">
							<ScrollArea className="h-full">
								<div className="p-4">{children}</div>
							</ScrollArea>
						</SheetContent>
					</Sheet>
				</div>

				{/* Desktop Sidebar */}
				<div
					ref={ref}
					className={cn(
						"relative hidden h-screen border-r bg-background transition-all duration-300 lg:block",
						isCollapsed ? "w-16" : "w-64",
						className,
					)}
					{...props}
				>
					<ScrollArea className="h-full">
						<div className={cn("p-4", isCollapsed && "p-2")}>{children}</div>
					</ScrollArea>
				</div>
			</>
		);
	},
);
Sidebar.displayName = "Sidebar";

interface SidebarNavProps {
	items: {
		title: string;
		href?: string;
		icon?: React.ReactNode;
		onClick?: () => void;
		active?: boolean;
		disabled?: boolean;
	}[];
	isCollapsed?: boolean;
}

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
	({ items, isCollapsed = false }, ref) => {
		return (
			<div ref={ref} className="space-y-1">
				{items.map((item, index) => {
					const ButtonContent = (
						<>
							{item.icon && (
								<span className={cn("mr-2", isCollapsed && "mr-0")}>
									{item.icon}
								</span>
							)}
							{!isCollapsed && <span>{item.title}</span>}
						</>
					);

					if (item.href) {
						return (
							<a key={index} href={item.href} className="block">
								<Button
									variant={item.active ? "secondary" : "ghost"}
									className={cn(
										"w-full justify-start",
										isCollapsed && "justify-center",
										item.disabled && "cursor-not-allowed opacity-50",
									)}
									disabled={item.disabled}
								>
									{ButtonContent}
								</Button>
							</a>
						);
					}

					return (
						<Button
							key={index}
							variant={item.active ? "secondary" : "ghost"}
							className={cn(
								"w-full justify-start",
								isCollapsed && "justify-center",
								item.disabled && "cursor-not-allowed opacity-50",
							)}
							disabled={item.disabled}
							onClick={item.onClick}
						>
							{ButtonContent}
						</Button>
					);
				})}
			</div>
		);
	},
);
SidebarNav.displayName = "SidebarNav";

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	isCollapsed?: boolean;
}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
	({ className, isCollapsed = false, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"mb-4 border-b px-3 py-2",
					isCollapsed && "px-1 py-1",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	return (
		<div
			ref={ref}
			className={cn("mt-auto border-t px-3 py-2", className)}
			{...props}
		/>
	);
});
SidebarFooter.displayName = "SidebarFooter";

export { Sidebar, SidebarNav, SidebarHeader, SidebarFooter };
