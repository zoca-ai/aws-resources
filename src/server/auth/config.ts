import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/server/db";
import {
	accounts,
	sessions,
	users,
	verificationTokens,
} from "@/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
			// ...other properties
			// role: UserRole;
		} & DefaultSession["user"];
	}

	// interface User {
	//   // ...other properties
	//   // role: UserRole;
	// }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	providers: [
		GoogleProvider({
			allowDangerousEmailAccountLinking: true,
		}),
	],
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	pages: {
		signIn: "/auth/signin",
		error: "/auth/error",
	},
	callbacks: {
		async signIn({ account, profile }) {
			if (account?.provider === "google") {
				const email = profile?.email;
				if (!email) return false;

				// Only allow @zoca.com and @zoca.ai domains
				const allowedDomains = ["zoca.com", "zoca.ai"];
				const emailDomain = email.split("@")[1];

				if (!emailDomain || !allowedDomains.includes(emailDomain)) {
					return "/auth/error?error=DomainNotAllowed";
				}
			}
			return true;
		},
		session: ({ session, user }) => ({
			...session,
			user: {
				...session.user,
				id: user.id,
			},
		}),
	},
} satisfies NextAuthConfig;
