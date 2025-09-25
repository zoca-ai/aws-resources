import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = [
	"/auth/signin",
	"/auth/signup",
	"/auth/error",
	"/api/auth",
];

// API routes that require authentication
const protectedApiRoutes = ["/api/trpc"];

export default async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow public routes
	if (publicRoutes.some((route) => pathname.startsWith(route))) {
		return NextResponse.next();
	}

	// Get session
	const session = await auth();

	// Protect API routes
	if (protectedApiRoutes.some((route) => pathname.startsWith(route))) {
		if (!session) {
			return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			});
		}
		return NextResponse.next();
	}

	// Redirect unauthenticated users to signin for all other routes
	if (!session) {
		const signInUrl = new URL("/auth/signin", request.url);
		signInUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(signInUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 */
		"/((?!_next/static|_next/image|favicon.ico|public/).*)",
	],
};
