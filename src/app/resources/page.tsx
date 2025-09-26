"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { formatResourceType } from "@/lib/format-utils";
import { api } from "@/trpc/react";
import { AlertCircle, Database, RefreshCw, Search, Tag } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
// tRPC API already imported above

export default function ResourcesPage() {
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [searchInput, setSearchInput] = useState("");
	const [selectedType, setSelectedType] = useState<string>("");
	const [selectedRegion, setSelectedRegion] = useState<string>("");

	// Debounce search input
	const debouncedSearch = useDebounce(searchInput, 500);

	// Memoize query input to prevent unnecessary refetches
	const queryInput = useMemo(() => ({
		page,
		limit,
		type: selectedType || undefined,
		region: selectedRegion || undefined,
		search: debouncedSearch || undefined,
	}), [page, limit, selectedType, selectedRegion, debouncedSearch]);

	// Fetch resources with optimized caching
	const {
		data: resourcesData,
		isLoading: loading,
		error,
		refetch,
	} = api.resources.list.useQuery(queryInput, {
		staleTime: 2 * 60 * 1000, // 2 minutes
		keepPreviousData: true, // Keep showing old data while fetching new
		refetchOnWindowFocus: true,
	});

	// Extract resources and pagination from tRPC response
	const resources = resourcesData?.resources || [];
	const pagination = resourcesData?.pagination;

	// Fetch stats with caching for getting all unique resource types
	const { data: stats } = api.stats.summary.useQuery(void 0, {
		staleTime: 5 * 60 * 1000, // 5 minutes - resource types don't change often
		refetchOnWindowFocus: false,
	});

	// Get utils for prefetching and cache management
	const utils = api.useUtils();

	// Refresh resource mutation
	const refreshResourceMutation = api.collector.refreshResource.useMutation();

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [debouncedSearch, selectedType, selectedRegion]);

	const handleRefresh = useCallback(() => {
		toast.promise(
			Promise.all([
				utils.resources.list.invalidate(),
				utils.stats.summary.invalidate(),
			]),
			{
				loading: "Refreshing resources...",
				success: "Resources updated",
				error: "Failed to refresh",
			}
		);
	}, [utils]);

	// Prefetch next page for better UX
	useEffect(() => {
		if (pagination && page < pagination.pages) {
			const nextQueryInput = { ...queryInput, page: page + 1 };
			utils.resources.list.prefetch(nextQueryInput);
		}
	}, [pagination, page, queryInput, utils]);

	const handleClearFilters = useCallback(() => {
		setSearchInput("");
		setSelectedType("");
		setSelectedRegion("");
		setPage(1);
		toast.success("Filters cleared");
	}, []);

	const handleRefreshResource = useCallback(
		async (resourceId: string, resourceType: string, region: string) => {
			try {
				await refreshResourceMutation.mutateAsync({
					resourceId,
					resourceType,
					region,
				});
				toast.success("Resource refreshed successfully");
				refetch();
			} catch (error) {
				console.error("Failed to refresh resource:", error);
				toast.error("Failed to refresh resource");
			}
		},
		[refetch],
	);

	// Get unique resource types from stats API and current resources
	const resourceTypes = useMemo(() => {
		const typesSet = new Set<string>();

		// Add types from stats (all available types in database)
		if (stats?.resourcesByType) {
			stats.resourcesByType.forEach(
				(item) => item.type && typesSet.add(item.type),
			);
		}

		// Add types from current page resources
		if (resources) {
			resources.forEach((r) => r.resourceType && typesSet.add(r.resourceType));
		}

		return Array.from(typesSet).sort();
	}, [stats, resources]);

	// Get unique regions from resources
	const regions = useMemo(() => {
		const regionsSet = new Set<string>();

		// Add regions from stats if available
		if (stats?.resourcesByRegion) {
			stats.resourcesByRegion.forEach(
				(item) => item.region && regionsSet.add(item.region),
			);
		}

		// Add regions from current resources
		if (resources) {
			resources.forEach((r) => r.region && regionsSet.add(r.region));
		}

		// Add common AWS regions
		["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"].forEach((r) =>
			regionsSet.add(r),
		);

		return Array.from(regionsSet).sort();
	}, [stats, resources]);

	// Get collector type categories for grouping

	if (loading && !resources) {
		return <Loading message="Loading resources..." />;
	}

	if (error && !resources) {
		return (
			<ErrorState
				title="Failed to load resources"
				message={error.message || "Unable to fetch resources"}
				onRetry={refetch}
			/>
		);
	}

	const hasFilters = searchInput || selectedType || selectedRegion;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl">Resources</h1>
			</div>

			{/* Filters */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-1 gap-2">
					<div className="relative max-w-sm flex-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search resources..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="pl-9"
						/>
					</div>

					<Select
						value={selectedType || "all"}
						onValueChange={(value) =>
							setSelectedType(value === "all" ? "" : value)
						}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent className="max-h-[300px]">
							<SelectItem value="all">All Types</SelectItem>
							{resourceTypes.map((type) => (
								<SelectItem key={type} value={type}>
									{formatResourceType(type)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={selectedRegion || "all"}
						onValueChange={(value) =>
							setSelectedRegion(value === "all" ? "" : value)
						}
					>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="All Regions" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Regions</SelectItem>
							{regions.map((region) => (
								<SelectItem key={region} value={region}>
									{region}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{hasFilters && (
						<Button variant="ghost" size="sm" onClick={handleClearFilters}>
							Clear
						</Button>
					)}
				</div>

				<Button
					onClick={handleRefresh}
					variant="outline"
					size="sm"
					disabled={loading}
				>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Pagination Top */}
			{pagination && pagination.total > 0 && (
				<Pagination
					currentPage={page}
					totalPages={pagination.pages}
					totalItems={pagination.total}
					itemsPerPage={limit}
					onPageChange={setPage}
					onItemsPerPageChange={(newLimit) => {
						setLimit(newLimit);
						setPage(1);
					}}
				/>
			)}

			{/* Resources Grid */}
			<div className="grid gap-4">
				{(loading && resources.length === 0) ? (
					<div className="space-y-4">
						{Array.from({ length: limit }).map((_, i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex-1 space-y-2">
											<div className="h-5 w-1/3 rounded bg-muted" />
											<div className="flex items-center gap-4">
												<div className="h-4 w-24 rounded bg-muted" />
												<div className="h-4 w-20 rounded bg-muted" />
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div className="space-y-2">
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 rounded bg-muted" />
												<div className="h-4 w-12 rounded bg-muted" />
											</div>
											<div className="flex flex-wrap gap-2">
												<div className="h-6 w-20 rounded bg-muted" />
												<div className="h-6 w-24 rounded bg-muted" />
												<div className="h-6 w-16 rounded bg-muted" />
											</div>
										</div>
										<div className="border-t pt-3">
											<div className="mb-2 h-4 w-20 rounded bg-muted" />
											<div className="grid grid-cols-2 gap-2">
												<div className="h-4 rounded bg-muted" />
												<div className="h-4 rounded bg-muted" />
												<div className="h-4 rounded bg-muted" />
												<div className="h-4 rounded bg-muted" />
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : resources.length > 0 ? (
					resources.map((resource) => (
						<Card
							key={resource.id}
							className="transition-colors hover:bg-accent/50"
						>
							<CardHeader className="pb-3">
								<div className="flex items-start justify-between">
									<div className="flex-1 space-y-1">
										<CardTitle className="font-medium text-base">
											{resource.resourceName || resource.resourceId}
										</CardTitle>
										<div className="flex items-center gap-4 text-muted-foreground text-sm">
											<span>
												Type: {formatResourceType(resource.resourceType)}
											</span>
											<span>Region: {resource.region}</span>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{/* Refresh button for resources with null/missing tags */}
										{(!resource.tags ||
											resource.tags.length === 0 ||
											resource.tags.some((tag) => !tag || !tag.key)) && (
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													handleRefreshResource(
														resource.resourceId,
														resource.resourceType,
														resource.region,
													)
												}
												className="gap-1 text-orange-600 hover:text-orange-700"
												title="Refresh to fetch tags"
											>
												<RefreshCw className="h-3 w-3" />
												Refresh
											</Button>
										)}
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2 font-medium text-sm">
											<Tag className="h-4 w-4" />
											<span>Tags</span>
										</div>
										{resource.tags && resource.tags.length > 0 ? (
											<div className="flex flex-wrap gap-2">
												{resource.tags.map((tag, index) => (
													<Badge
														key={index}
														variant="outline"
														className="text-xs"
													>
														{tag?.key ? (
															<>
																<span className="font-medium">{tag.key}</span>
																{tag.value && (
																	<>
																		<span className="mx-1 text-muted-foreground">
																			:
																		</span>
																		<span>{tag.value}</span>
																	</>
																)}
															</>
														) : (
															<span className="text-muted-foreground">
																Invalid tag
															</span>
														)}
													</Badge>
												))}
											</div>
										) : (
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<AlertCircle className="h-4 w-4 text-orange-600" />
												<span>No tags - Click refresh to fetch tags</span>
											</div>
										)}
									</div>

									{resource.properties &&
										Object.keys(resource.properties).length && (
											<div className="space-y-2 border-t pt-3">
												<div className="font-medium text-sm">Properties</div>
												<div className="grid grid-cols-2 gap-2 text-sm">
													{Object.entries(resource.properties)
														.slice(0, 4)
														.map(([key, value]) => (
															<div key={key}>
																<span className="text-muted-foreground">
																	{key}:
																</span>{" "}
																{String(value ?? "")}
															</div>
														))}
												</div>
												{Object.keys(resource.properties).length > 4 && (
													<div className="text-muted-foreground text-sm">
														+{Object.keys(resource.properties).length - 4} more
														properties
													</div>
												)}
											</div>
										)}

									{/* Resource ID */}
									<div className="border-t pt-3 text-muted-foreground text-xs">
										<span className="font-medium">Resource ID:</span>{" "}
										{resource.resourceId}
										{resource.resourceArn && (
											<>
												<br />
												<span className="font-medium">ARN:</span>{" "}
												{resource.resourceArn}
											</>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					))
				) : (
					<EmptyState
						icon={Database}
						title="No resources found"
						description={
							hasFilters
								? "Try adjusting your filters"
								: "Start by collecting resources"
						}
						action={
							hasFilters
								? {
										label: "Clear Filters",
										onClick: handleClearFilters,
									}
								: {
										label: "Collect Resources",
										onClick: () => (window.location.href = "/collect"),
									}
						}
					/>
				)}
			</div>

			{/* Pagination Bottom */}
			{pagination && pagination.total > limit && (
				<Pagination
					currentPage={page}
					totalPages={pagination.pages}
					totalItems={pagination.total}
					itemsPerPage={limit}
					onPageChange={setPage}
					onItemsPerPageChange={(newLimit) => {
						setLimit(newLimit);
						setPage(1);
					}}
				/>
			)}
		</div>
	);
}
