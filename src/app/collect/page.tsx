"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Loading } from "@/components/ui/loading";
import { Progress } from "@/components/ui/progress";
import { api } from "@/trpc/react";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Cloud,
	Database,
	Globe,
	HardDrive,
	Loader2,
	Lock,
	MessageSquare,
	Network,
	PlayCircle,
	RefreshCw,
	Server,
	Shield,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface CollectionStatus {
	resourceType: string;
	status: "pending" | "collecting" | "completed" | "failed";
	count?: number;
	error?: string;
}

// Icon mapping for categories and types
const iconMapping: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	// Categories
	Compute: Server,
	Storage: HardDrive,
	Database: Database,
	Networking: Network,
	Infrastructure: Cloud,
	Security: Lock,
	Messaging: MessageSquare,

	// Specific icons
	Cloud: Cloud,
	Server: Server,
	Network: Network,
	Globe: Globe,
	HardDrive: HardDrive,
	Lock: Lock,
	Shield: Shield,
};

export default function CollectPage() {
	const {
		data: collectorTypes,
		isLoading: loading,
		error,
		refetch,
	} = api.collector.types.useQuery();
	const { data: resourceTypes, refetch: refetchCounts } =
		api.resources.types.useQuery();

	// Adapting resourceTypes data structure
	const resourceCounts = resourceTypes;
	const collectMutation = api.collector.collect.useMutation();
	const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
	const [isCollecting, setIsCollecting] = useState(false);
	const [collectionStatus, setCollectionStatus] = useState<CollectionStatus[]>(
		[],
	);
	const [overallProgress, setOverallProgress] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Create a map of collector ID to total resource count
	const resourceCountMap = useMemo(() => {
		const map: Record<string, number> = {};
		if (resourceCounts && collectorTypes) {
			// Create mapping from actual API resource types to collector IDs
			const resourceTypeMapping: Record<string, string> = {
				// EC2 resources
				'ec2-instance': 'ec2',
				'ec2-vpc': 'ec2',
				'ec2-subnet': 'ec2',
				'security-group': 'ec2',
				'ebs-volume': 'ec2',
				'ec2-volume': 'ec2',
				'ec2-security-group': 'ec2',

				// Lambda
				'lambda-function': 'lambda',

				// ECR
				'ecr-repository': 'ecr',

				// ECS
				'ecs-cluster': 'ecs',
				'ecs-service': 'ecs',

				// RDS
				'rds-instance': 'rds',
				'rds-cluster': 'rds',
				'rds-subnet-group': 'rds',

				// DynamoDB
				'dynamodb-table': 'dynamodb',

				// ElastiCache
				'elasticache-cluster': 'elasticache',

				// Load Balancer
				'load-balancer': 'loadbalancer',
				'application-load-balancer': 'loadbalancer',
				'network-load-balancer': 'loadbalancer',
				'gateway-load-balancer': 'loadbalancer',

				// Route53
				'route53-hosted-zone': 'route53',
				'hosted-zone': 'route53',

				// S3
				's3-bucket': 's3',

				// Step Functions
				'step-function': 'stepfunctions',
				'state-machine': 'stepfunctions',
			};

			// Map resource counts to collectors using the mapping
			resourceCounts.forEach((item) => {
				const collectorId = resourceTypeMapping[item.type.toLowerCase()];
				if (collectorId) {
					map[collectorId] = (map[collectorId] || 0) + item.count;
				}
			});
		}
		return map;
	}, [resourceCounts, collectorTypes]);

	// Group types by category
	const typesByCategory = useMemo(() => {
		if (!collectorTypes) return {};

		const grouped: Record<string, typeof collectorTypes> = {};
		collectorTypes.forEach((type) => {
			if (!grouped[type.category]) {
				grouped[type.category] = [];
			}
			grouped[type.category]?.push(type);
		});
		return grouped;
	}, [collectorTypes]);

	// Get unique categories
	const categories = useMemo(() => {
		return Object.keys(typesByCategory).sort();
	}, [typesByCategory]);

	const handleSelectAll = () => {
		if (!collectorTypes) return;

		if (selectedTypes.size === collectorTypes.length) {
			setSelectedTypes(new Set());
		} else {
			setSelectedTypes(new Set(collectorTypes.map((r) => r.id)));
		}
	};

	const handleSelectCategory = (category: string) => {
		const categoryTypes = typesByCategory[category] || [];
		const categoryIds = new Set(categoryTypes.map((r) => r.id));

		const allSelected = categoryTypes.every((r) => selectedTypes.has(r.id));

		if (allSelected) {
			const newSelected = new Set(selectedTypes);
			categoryIds.forEach((id) => newSelected.delete(id));
			setSelectedTypes(newSelected);
		} else {
			setSelectedTypes(new Set([...selectedTypes, ...categoryIds]));
		}
	};

	const handleToggleType = (typeId: string) => {
		const newSelected = new Set(selectedTypes);
		if (newSelected.has(typeId)) {
			newSelected.delete(typeId);
		} else {
			newSelected.add(typeId);
		}
		setSelectedTypes(newSelected);
	};

	const handleStartCollection = async () => {
		if (selectedTypes.size === 0) {
			toast.error("Please select at least one resource type");
			return;
		}

		setIsCollecting(true);
		setOverallProgress(0);

		const typesToCollect = Array.from(selectedTypes);
		const initialStatus = typesToCollect.map((type) => ({
			resourceType: type,
			status: "pending" as const,
		}));
		setCollectionStatus(initialStatus);

		// Simulate collection process for each type
		for (let i = 0; i < typesToCollect.length; i++) {
			const type = typesToCollect[i];

			// Update status to collecting
			setCollectionStatus((prev) =>
				prev.map((s) =>
					s.resourceType === type ? { ...s, status: "collecting" } : s,
				),
			);

			try {
				// Call the tRPC API to collect resources
				const result = await collectMutation.mutateAsync({
					types: [String(type)],
					async: false,
				});

				// Update status to completed
				const count = result?.resourcesCollected || 0;
				setCollectionStatus((prev) =>
					prev.map((s) =>
						s.resourceType === type ? { ...s, status: "completed", count } : s,
					),
				);

				toast.success(`Collected ${count} ${type} resources`);
			} catch (error) {
				// Update status to failed
				setCollectionStatus((prev) =>
					prev.map((s) =>
						s.resourceType === type
							? { ...s, status: "failed", error: (error as Error).message }
							: s,
					),
				);

				toast.error(`Failed to collect ${type}: ${(error as Error).message}`);
			}

			// Update progress
			setOverallProgress(((i + 1) / typesToCollect.length) * 100);
		}

		setIsCollecting(false);
		toast.success("Collection complete!");
		// Refresh resource counts after collection
		await refetchCounts();
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await Promise.all([refetch(), refetchCounts()]);
			toast.success("Data refreshed successfully");
		} catch (error) {
			toast.error("Failed to refresh data");
		} finally {
			setIsRefreshing(false);
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "pending":
				return <Clock className="h-4 w-4" />;
			case "collecting":
				return <Loader2 className="h-4 w-4 animate-spin" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <AlertCircle className="h-4 w-4 text-red-500" />;
			default:
				return null;
		}
	};

	const getStatusVariant = (
		status: string,
	): "default" | "secondary" | "success" | "destructive" | "outline" => {
		switch (status) {
			case "completed":
				return "success";
			case "failed":
				return "destructive";
			case "collecting":
				return "secondary";
			default:
				return "outline";
		}
	};

	if (loading) {
		return <Loading message="Loading collector types..." />;
	}

	if (error) {
		return (
			<ErrorState
				title="Failed to load collector types"
				message={error.message || "Unable to fetch available collectors"}
				onRetry={refetch}
			/>
		);
	}

	if (!collectorTypes || collectorTypes.length === 0) {
		return (
			<EmptyState
				icon={Cloud}
				title="No collectors available"
				description="Unable to find any resource collectors"
				action={{
					label: "Retry",
					onClick: refetch,
				}}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-bold text-2xl">Collect AWS Resources</h1>
					<p className="text-muted-foreground">
						Select the types of resources you want to collect from your AWS
						account.
					</p>
				</div>
				<Button
					variant="outline"
					onClick={handleRefresh}
					disabled={isRefreshing}
				>
					{isRefreshing ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Refreshing...
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Refresh
						</>
					)}
				</Button>
			</div>

			{/* Current Resources Summary */}
			{resourceCounts && resourceCounts.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Current Resources</CardTitle>
						<CardDescription>
							You have{" "}
							{resourceCounts.reduce((sum, item) => sum + item.count, 0)}{" "}
							resources across {resourceCounts.length} different types
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
							{Object.entries(resourceCountMap).map(([typeId, count]) => {
								const typeInfo = collectorTypes.find((t) => t.id === typeId);
								if (!typeInfo || count === 0) return null;
								const TypeIcon = iconMapping[typeInfo.icon] || Server;
								return (
									<div
										key={typeId}
										className="flex items-center gap-2 rounded-lg border p-2"
									>
										<TypeIcon className="h-4 w-4 text-muted-foreground" />
										<div className="flex-1">
											<p className="font-medium text-sm">{typeInfo.name}</p>
											<p className="text-muted-foreground text-xs">
												{count} resources
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Selection Summary */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Resource Selection</CardTitle>
							<CardDescription>
								{selectedTypes.size} of {collectorTypes.length} resource types
								selected
							</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" onClick={handleSelectAll}>
								{selectedTypes.size === collectorTypes.length
									? "Deselect All"
									: "Select All"}
							</Button>
							<Button
								onClick={handleStartCollection}
								disabled={selectedTypes.size === 0 || isCollecting}
							>
								{isCollecting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Collecting...
									</>
								) : (
									<>
										<PlayCircle className="mr-2 h-4 w-4" />
										Start Collection
									</>
								)}
							</Button>
						</div>
					</div>
				</CardHeader>
				{isCollecting && (
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span>Overall Progress</span>
								<span>{Math.round(overallProgress)}%</span>
							</div>
							<Progress value={overallProgress} />
						</div>
					</CardContent>
				)}
			</Card>

			{/* Collection Status */}
			{collectionStatus.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Collection Status</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{collectionStatus.map((status) => {
								const typeInfo = collectorTypes.find(
									(t) => t.id === status.resourceType,
								);
								return (
									<div
										key={status.resourceType}
										className="flex items-center justify-between rounded-lg border p-2"
									>
										<div className="flex items-center gap-2">
											{getStatusIcon(status.status)}
											<span className="font-medium">
												{typeInfo?.name || status.resourceType}
											</span>
										</div>
										<div className="flex items-center gap-2">
											{status.count !== undefined && (
												<span className="text-muted-foreground text-sm">
													{status.count} resources
												</span>
											)}
											{status.status === "pending" && (
												<Badge variant="outline" className="text-xs">
													<Clock className="mr-1 h-3 w-3" />
													Pending
												</Badge>
											)}
											{status.status === "collecting" && (
												<Badge variant="secondary" className="text-xs">
													<Loader2 className="mr-1 h-3 w-3 animate-spin" />
													Collecting
												</Badge>
											)}
											{status.status === "completed" && (
												<Badge variant="success" className="text-xs">
													<CheckCircle className="mr-1 h-3 w-3" />
													Complete
												</Badge>
											)}
											{status.status === "failed" && (
												<Badge variant="destructive" className="text-xs">
													<AlertCircle className="mr-1 h-3 w-3" />
													Failed
												</Badge>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Resource Types by Category */}
			{categories.map((category) => {
				const categoryTypes = typesByCategory[category] || [];
				const CategoryIcon = iconMapping[category] || Server;
				const selectedInCategory = categoryTypes.filter((t) =>
					selectedTypes.has(t.id),
				).length;

				return (
					<Card key={category}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<CategoryIcon className="h-5 w-5" />
									<CardTitle>{category}</CardTitle>
									<Badge variant="secondary">
										{selectedInCategory}/{categoryTypes.length} selected
									</Badge>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleSelectCategory(category)}
								>
									{selectedInCategory === categoryTypes.length
										? "Deselect All"
										: "Select All"}
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3 md:grid-cols-2">
								{categoryTypes.map((type) => {
									const TypeIcon = iconMapping[type.icon] || Server;
									return (
										<div
											key={type.id}
											className="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
											onClick={() => handleToggleType(type.id)}
										>
											<Checkbox
												checked={selectedTypes.has(type.id)}
												onCheckedChange={() => handleToggleType(type.id)}
												onClick={(e) => e.stopPropagation()}
											/>
											<div className="flex-1 space-y-1">
												<div className="flex items-center gap-2">
													<TypeIcon className="h-4 w-4 text-muted-foreground" />
													<p className="font-medium">{type.name}</p>
													{resourceCountMap[type.id] !== undefined &&
														resourceCountMap[type.id] && (
															<Badge variant="secondary" className="text-xs">
																{resourceCountMap[type.id]} existing
															</Badge>
														)}
												</div>
												<p className="text-muted-foreground text-sm">
													{type.description}
												</p>
												{type.resources && type.resources.length > 0 && (
													<div className="mt-2 flex flex-wrap gap-1">
														{type.resources.slice(0, 3).map((resource, idx) => (
															<Badge
																key={idx}
																variant="outline"
																className="text-xs"
															>
																{resource}
															</Badge>
														))}
														{type.resources.length > 3 && (
															<Badge variant="outline" className="text-xs">
																+{type.resources.length - 3} more
															</Badge>
														)}
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
