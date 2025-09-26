import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET: z.string(),
		AUTH_GOOGLE_ID: z.string(),
		AUTH_GOOGLE_SECRET: z.string(),
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		// AWS Configuration
		AWS_REGION: z.string().default("us-east-1"),
		AWS_PROFILE: z.string().default("default"),

		// AWS Credentials (optional - can use credentials file instead)
		AWS_ACCESS_KEY_ID: z.string().optional(),
		AWS_SECRET_ACCESS_KEY: z.string().optional(),
		AWS_SESSION_TOKEN: z.string().optional(),

		// AWS Credentials file paths (optional)
		AWS_SHARED_CREDENTIALS_FILE: z.string().optional(),
		AWS_CONFIG_FILE: z.string().optional(),

		// AWS Role-based access (optional)
		AWS_ROLE_ARN: z.string().optional(),
		AWS_ROLE_SESSION_NAME: z.string().default("aws-resource-collector"),

		// Collection settings
		COLLECTION_TIMEOUT: z
			.string()
			.transform(Number)
			.pipe(z.number().positive())
			.default("300000"),
		COLLECTION_RETRY_ATTEMPTS: z
			.string()
			.transform(Number)
			.pipe(z.number().positive())
			.default("3"),
		COLLECTION_RETRY_DELAY: z
			.string()
			.transform(Number)
			.pipe(z.number().positive())
			.default("1000"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,

		// AWS Configuration
		AWS_REGION: process.env.AWS_REGION,
		AWS_PROFILE: process.env.AWS_PROFILE,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
		AWS_SHARED_CREDENTIALS_FILE: process.env.AWS_SHARED_CREDENTIALS_FILE,
		AWS_CONFIG_FILE: process.env.AWS_CONFIG_FILE,
		AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
		AWS_ROLE_SESSION_NAME: process.env.AWS_ROLE_SESSION_NAME,
		COLLECTION_TIMEOUT: process.env.COLLECTION_TIMEOUT,
		COLLECTION_RETRY_ATTEMPTS: process.env.COLLECTION_RETRY_ATTEMPTS,
		COLLECTION_RETRY_DELAY: process.env.COLLECTION_RETRY_DELAY,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
