import { accountRouter } from "@/server/api/routers/account";
import { collectorRouter } from "@/server/api/routers/collector";
import { migrationRouter } from "@/server/api/routers/migration";
import { postRouter } from "@/server/api/routers/post";
import { resourcesRouter } from "@/server/api/routers/resources";
import { statsRouter } from "@/server/api/routers/stats";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	account: accountRouter,
	post: postRouter,
	resources: resourcesRouter,
	stats: statsRouter,
	collector: collectorRouter,
	migration: migrationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
