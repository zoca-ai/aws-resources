import type { Config } from "drizzle-kit";

import { env } from "@/env";

export default {
	schema: "./src/server/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL || "postgresql://localhost:5432/db",
	},
	tablesFilter: ["aws-resources_*"],
} satisfies Config;
