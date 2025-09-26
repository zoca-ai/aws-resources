import {
	QueryClient,
	defaultShouldDehydrateQuery,
	MutationCache,
	QueryCache,
} from "@tanstack/react-query";
import SuperJSON from "superjson";
import { toast } from "sonner";

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// Optimize stale times for different types of data
				staleTime: 5 * 60 * 1000, // 5 minutes default
				gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
				retry: (failureCount, error: any) => {
					// Don't retry on 4xx errors (client errors)
					if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
						return false;
					}
					// Retry up to 3 times for other errors
					return failureCount < 3;
				},
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
				refetchOnWindowFocus: false, // Disable for AWS data that doesn't change frequently
				refetchOnMount: 'always',
				refetchOnReconnect: 'always',
			},
			mutations: {
				retry: 1,
				retryDelay: 1000,
			},
			dehydrate: {
				serializeData: SuperJSON.serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) ||
					query.state.status === "pending",
			},
			hydrate: {
				deserializeData: SuperJSON.deserialize,
			},
		},
		queryCache: new QueryCache({
			onError: (error: any, query) => {
				// Global error handling for queries
				console.error('Query error:', error, 'Query key:', query.queryKey);

				// Don't show toast for background refetches
				if (query.state.fetchStatus !== 'fetching' || query.state.dataUpdateCount === 0) {
					toast.error(`Failed to fetch data: ${error.message}`);
				}
			},
		}),
		mutationCache: new MutationCache({
			onError: (error: any, _variables, _context, mutation) => {
				// Global error handling for mutations
				console.error('Mutation error:', error, 'Mutation:', mutation);

				// Show error toast for mutations unless explicitly handled
				if (!mutation.meta?.skipErrorToast) {
					toast.error(`Operation failed: ${error.message}`);
				}
			},
			onSuccess: (data: any, _variables, _context, mutation) => {
				// Global success handling for mutations
				if (mutation.meta?.successMessage) {
					toast.success(mutation.meta.successMessage as string);
				}
			},
		}),
	});
