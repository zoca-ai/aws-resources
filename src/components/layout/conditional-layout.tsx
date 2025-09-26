"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isAuthPage = pathname.startsWith("/auth/");

  // Sync client-side session state with middleware
  useEffect(() => {
    if (status === "loading") return;

    if (!session && !isAuthPage) {
      // Let middleware handle the redirect
      window.location.href = `/auth/signup?callbackUrl=${encodeURIComponent(pathname)}`;
    }
  }, [session, status, isAuthPage, pathname]);

  if (isAuthPage) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  // Show loading state while session is being checked
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
