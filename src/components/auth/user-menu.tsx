"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

interface UserMenuProps {
	isCollapsed?: boolean;
}

export function UserMenu({ isCollapsed = false }: UserMenuProps) {
	const { data: session } = useSession();

	if (!session?.user) {
		return null;
	}

	const handleSignOut = async () => {
		await signOut({ callbackUrl: "/auth/signin" });
	};

	const userInitials = session.user.name
		? session.user.name
				.split(" ")
				.map((name) => name[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: session.user.email?.[0]?.toUpperCase() || "U";

	return (
		<div className="w-full">
			{isCollapsed ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="relative mx-auto h-10 w-10 rounded-full"
						>
							<Avatar className="h-9 w-9">
								<AvatarImage
									src={session.user.image || undefined}
									alt={session.user.name || "User"}
								/>
								<AvatarFallback className="text-sm">
									{userInitials}
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="end" forceMount>
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="font-medium text-sm leading-none">
									{session.user.name || "User"}
								</p>
								<p className="text-muted-foreground text-xs leading-none">
									{session.user.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="cursor-pointer">
							<User className="mr-2 h-4 w-4" />
							<span>Profile</span>
						</DropdownMenuItem>
						<DropdownMenuItem className="cursor-pointer">
							<Settings className="mr-2 h-4 w-4" />
							<span>Settings</span>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="cursor-pointer text-destructive focus:text-destructive"
							onClick={handleSignOut}
						>
							<LogOut className="mr-2 h-4 w-4" />
							<span>Sign out</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<div className="flex items-center space-x-3 p-2">
					<Avatar className="h-9 w-9 flex-shrink-0">
						<AvatarImage
							src={session.user.image || undefined}
							alt={session.user.name || "User"}
						/>
						<AvatarFallback className="text-sm">{userInitials}</AvatarFallback>
					</Avatar>
					<div className="flex min-w-0 flex-1 flex-col">
						<p className="truncate font-medium text-sm leading-none">
							{session.user.name || "User"}
						</p>
						<p className="mt-1 truncate text-muted-foreground text-xs leading-none">
							{session.user.email}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
