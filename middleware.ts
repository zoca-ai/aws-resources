import { auth } from "@/server/auth/index";
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

	console.log(`[Middleware] Processing request to: ${pathname}`);

	// Allow public routes
	if (publicRoutes.some((route) => pathname.startsWith(route))) {
		console.log(`[Middleware] Public route detected, allowing: ${pathname}`);
		return NextResponse.next();
	}

	// Get session
	const session = await auth();
	console.log(`[Middleware] Session status: ${session ? 'authenticated' : 'not authenticated'}`);

	// Protect API routes
	if (protectedApiRoutes.some((route) => pathname.startsWith(route))) {
		if (!session) {
			console.log(`[Middleware] Unauthorized API access to: ${pathname}`);
			return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			});
		}
		return NextResponse.next();
	}

	// Redirect unauthenticated users to signup for all other routes
	if (!session) {
		const signUpUrl = new URL("/auth/signup", request.url);
		signUpUrl.searchParams.set("callbackUrl", pathname);
		console.log(`[Middleware] Redirecting unauthenticated user from ${pathname} to ${signUpUrl.toString()}`);
		return NextResponse.redirect(signUpUrl);
	}

	console.log(`[Middleware] Authenticated user accessing: ${pathname}`);
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
