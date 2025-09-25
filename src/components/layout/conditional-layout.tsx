"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import { usePathname } from "next/navigation";

interface ConditionalLayoutProps {
	children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
	const pathname = usePathname();

	const isAuthPage = pathname.startsWith("/auth/");

	if (isAuthPage) {
		return <AuthLayout>{children}</AuthLayout>;
	}

	return <AppLayout>{children}</AppLayout>;
}
