"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Cloud } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	const getErrorDetails = (error: string | null) => {
		switch (error) {
			case "DomainNotAllowed":
				return {
					title: "Access Restricted",
					description:
						"Your email domain is not authorized to access this application.",
					details:
						"Only @zoca.com and @zoca.ai email addresses are allowed to sign in to the AWS Resource Manager.",
				};
			case "Configuration":
				return {
					title: "Server Configuration Error",
					description:
						"There is a problem with the authentication configuration.",
					details:
						"Please contact your system administrator to resolve this issue.",
				};
			case "AccessDenied":
				return {
					title: "Access Denied",
					description: "You do not have permission to access this application.",
					details: "Please ensure you are using an authorized email address.",
				};
			case "Verification":
				return {
					title: "Verification Error",
					description:
						"The verification link has expired or has already been used.",
					details:
						"Please try signing in again to receive a new verification link.",
				};
			default:
				return {
					title: "Authentication Error",
					description: "An unexpected error occurred during authentication.",
					details:
						"Please try signing in again. If the problem persists, contact support.",
				};
		}
	};

	const errorDetails = getErrorDetails(error);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mb-4 flex justify-center">
						<div className="rounded-full bg-destructive/10 p-3">
							<AlertTriangle className="h-8 w-8 text-destructive" />
						</div>
					</div>
					<CardTitle className="text-destructive text-xl">
						{errorDetails.title}
					</CardTitle>
					<CardDescription>{errorDetails.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md bg-muted/50 p-4">
						<p className="text-muted-foreground text-sm">
							{errorDetails.details}
						</p>
					</div>

					<div className="flex flex-col space-y-2">
						<Link href="/auth/signin">
							<Button className="w-full">Try Again</Button>
						</Link>
						<Link href="/">
							<Button variant="ghost" className="w-full">
								Return to Home
							</Button>
						</Link>
					</div>

					<div className="flex items-center justify-center space-x-2 text-muted-foreground text-xs">
						<Cloud className="h-4 w-4" />
						<span>AWS Resource Manager</span>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function AuthErrorPage() {
	return (
		<Suspense fallback={
			<div className="flex min-h-screen items-center justify-center bg-background px-4">
				<Card className="w-full max-w-md">
					<CardContent className="flex items-center justify-center p-8">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					</CardContent>
				</Card>
			</div>
		}>
			<AuthErrorContent />
		</Suspense>
	);
}
