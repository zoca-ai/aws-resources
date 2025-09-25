import "@/styles/globals.css";

import { ConditionalLayout } from "@/components/layout/conditional-layout";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { Geist, Geist_Mono } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "AWS Resources Manager",
	description: "AWS Resource Collection and Management Dashboard",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable}`}
		>
			<body className="dark antialiased">
				<SessionProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem={false}
						disableTransitionOnChange
					>
						<TRPCReactProvider>
							<ConditionalLayout>{children}</ConditionalLayout>
							<Toaster position="bottom-right" />
						</TRPCReactProvider>
					</ThemeProvider>
				</SessionProvider>
			</body>
		</html>
	);
}
