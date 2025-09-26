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
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/ui/export-button";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import { Progress } from "@/components/ui/progress";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatResourceType } from "@/lib/format-utils";
import { api } from "@/trpc/react";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Cloud,
	Database,
	GitBranch,
	HardDrive,
	Lock,
	MapPin,
	MessageSquare,
	Network,
	Package,
	RefreshCw,
	Server,
	Shield,
	TrendingUp,
	User,
} from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

// Resource type to category mapping (supports both CloudFormation and kebab-case formats)
const resourceCategoryMapping: Record<string, string> = {
	// Compute - CloudFormation format
	"AWS::EC2::Instance": "Compute",
	"AWS::Lambda::Function": "Compute",
	"AWS::ECS::Service": "Compute",
	"AWS::ECS::Cluster": "Compute",
	"AWS::ECR::Repository": "Compute",
	"AWS::EC2::LaunchTemplate": "Compute",
	"AWS::AutoScaling::AutoScalingGroup": "Compute",
	"AWS::Batch::ComputeEnvironment": "Compute",

	// Compute - kebab-case format
	"ec2-instance": "Compute",
	"lambda-function": "Compute",
	"ecs-service": "Compute",
	"ecs-cluster": "Compute",
	"ecs-task-definition": "Compute",
	"ecr-repository": "Compute",
	ami: "Compute",

	// Storage - CloudFormation format
	"AWS::S3::Bucket": "Storage",
	"AWS::EFS::FileSystem": "Storage",
	"AWS::EBS::Volume": "Storage",
	"AWS::Backup::BackupPlan": "Storage",
	"AWS::FSx::FileSystem": "Storage",

	// Storage - kebab-case format
	"s3-bucket": "Storage",
	"ebs-volume": "Storage",
	"ebs-snapshot": "Storage",

	// Database - CloudFormation format
	"AWS::RDS::DBInstance": "Database",
	"AWS::RDS::DBCluster": "Database",
	"AWS::DynamoDB::Table": "Database",
	"AWS::ElastiCache::CacheCluster": "Database",
	"AWS::Redshift::Cluster": "Database",
	"AWS::Neptune::DBCluster": "Database",
	"AWS::DocumentDB::DBCluster": "Database",

	// Database - kebab-case format
	"rds-instance": "Database",
	"rds-cluster": "Database",
	"dynamodb-table": "Database",
	"elasticache-cluster": "Database",

	// Networking - CloudFormation format
	"AWS::ElasticLoadBalancingV2::LoadBalancer": "Networking",
	"AWS::ElasticLoadBalancing::LoadBalancer": "Networking",
	"AWS::Route53::HostedZone": "Networking",
	"AWS::CloudFront::Distribution": "Networking",
	"AWS::ApiGateway::RestApi": "Networking",
	"AWS::ApiGatewayV2::Api": "Networking",
	"AWS::EC2::VPC": "Networking",
	"AWS::EC2::Subnet": "Networking",
	"AWS::EC2::SecurityGroup": "Networking",
	"AWS::EC2::RouteTable": "Networking",
	"AWS::EC2::NatGateway": "Networking",
	"AWS::EC2::InternetGateway": "Networking",

	// Networking - kebab-case format
	"load-balancer": "Networking",
	"target-group": "Networking",
	"route53-hosted-zone": "Networking",
	"route53-record-set": "Networking",
	"cloudfront-distribution": "Networking",
	"api-gateway": "Networking",
	"api-gateway-rest-api": "Networking",
	"api-gateway-http-api": "Networking",
	vpc: "Networking",
	subnet: "Networking",
	"security-group": "Networking",
	"nat-gateway": "Networking",
	"internet-gateway": "Networking",
	"elastic-network-interface": "Networking",

	// Infrastructure - CloudFormation format
	"AWS::CloudFormation::Stack": "Infrastructure",
	"AWS::CloudWatch::Alarm": "Infrastructure",
	"AWS::CloudWatch::Dashboard": "Infrastructure",
	"AWS::Config::ConfigRule": "Infrastructure",
	"AWS::SSM::Parameter": "Infrastructure",
	"AWS::SSM::Document": "Infrastructure",

	// Infrastructure - kebab-case format
	"cloudformation-stack": "Infrastructure",
	"cloudwatch-alarm": "Infrastructure",

	// Security - CloudFormation format
	"AWS::IAM::Role": "Security",
	"AWS::IAM::User": "Security",
	"AWS::IAM::Policy": "Security",
	"AWS::IAM::Group": "Security",
	"AWS::KMS::Key": "Security",
	"AWS::SecretsManager::Secret": "Security",
	"AWS::WAF::WebACL": "Security",
	"AWS::CertificateManager::Certificate": "Security",

	// Security - kebab-case format
	"iam-role": "Security",
	"iam-user": "Security",
	"iam-policy": "Security",
	"iam-group": "Security",

	// Messaging - CloudFormation format
	"AWS::SNS::Topic": "Messaging",
	"AWS::SQS::Queue": "Messaging",
	"AWS::Events::Rule": "Messaging",
	"AWS::Kinesis::Stream": "Messaging",
	"AWS::StepFunctions::StateMachine": "Messaging",

	// Messaging - kebab-case format
	"sns-topic": "Messaging",
	"sns-subscription": "Messaging",
	"sqs-queue": "Messaging",
};

const categoryIcons: Record<
	string,
	React.ComponentType<{ className?: string }>
> = {
	Compute: Server,
	Storage: HardDrive,
	Database: Database,
	Networking: Network,
	Infrastructure: Cloud,
	Security: Lock,
	Messaging: MessageSquare,
};

const categoryColors: Record<string, string> = {
	Compute: "bg-blue-500",
	Storage: "bg-green-500",
	Database: "bg-purple-500",
	Networking: "bg-orange-500",
	Infrastructure: "bg-gray-500",
	Security: "bg-red-500",
	Messaging: "bg-indigo-500",
};

export default function DashboardPage() {
	// Optimized data fetching with proper caching
	const {
		data: migrationStats,
		isLoading: migrationLoading,
		error: migrationError,
		refetch: refetchMigration,
	} = api.migration.statistics.useQuery(void 0, {
		staleTime: 3 * 60 * 1000, // 3 minutes - migration stats don't change frequently
		refetchOnWindowFocus: true,
		refetchInterval: 5 * 60 * 1000, // Background refresh every 5 minutes
	});

	const {
		data: generalStats,
		isLoading: generalLoading,
		error: generalError,
		refetch: refetchGeneral,
	} = api.stats.summary.useQuery(void 0, {
		staleTime: 2 * 60 * 1000, // 2 minutes - resource counts change more often
		refetchOnWindowFocus: true,
		refetchInterval: 3 * 60 * 1000, // Background refresh every 3 minutes
	});

	const {
		data: accountInfo,
		isLoading: accountLoading,
		error: accountError,
		refetch: refetchAccount,
	} = api.account.info.useQuery(void 0, {
		staleTime: 15 * 60 * 1000, // 15 minutes - account info is static
		refetchOnWindowFocus: false, // Don't refetch account info on focus
	});

	// Get utils for cache management
	const utils = api.useUtils();

	const handleRefresh = async () => {
		toast.promise(
			Promise.all([
				utils.migration.statistics.invalidate(),
				utils.stats.summary.invalidate(),
				utils.account.info.invalidate(),
			]),
			{
				loading: "Refreshing data...",
				success: "Data refreshed successfully",
				error: "Failed to refresh data",
			},
		);
	};

	if (migrationLoading || generalLoading || accountLoading) {
		return <PageSkeleton />;
	}

	// Show empty state for both errors and no data
	if (!migrationStats || !generalStats) {
		const isError = Boolean(migrationError || generalError);
		return (
			<EmptyState
				icon={isError ? AlertCircle : Cloud}
				title={isError ? "Unable to load data" : "No data yet"}
				description={
					isError
						? "Check your backend connection"
						: "Start by collecting resources"
				}
				action={{
					label: isError ? "Retry" : "Get Started",
					onClick: isError
						? handleRefresh
						: () => toast.info("Use the API to collect resources"),
				}}
			/>
		);
	}

	// Parse migration statistics
	const totalResources = migrationStats.overview?.totalResources || 0;
	const mappedResources = migrationStats.overview?.mappedResources || 0;
	const progressPercentage = Number.parseFloat(
		migrationStats.overview?.migrationProgress || "0",
	);

	// Create status counts from byStatus array
	const statusCounts = {
		notStarted:
			migrationStats.byStatus?.find((s) => s.status === "not_started")?.count ||
			0,
		inProgress:
			migrationStats.byStatus?.find((s) => s.status === "in_progress")?.count ||
			0,
		migrated:
			migrationStats.byStatus?.find((s) => s.status === "migrated")?.count || 0,
		verified:
			migrationStats.byStatus?.find((s) => s.status === "verified")?.count || 0,
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">Dashboard</h1>
					{accountInfo && (
						<div className="mt-2 flex items-center gap-4 text-muted-foreground text-sm">
							<div className="flex items-center gap-1">
								<User className="h-3 w-3" />
								<span>Account: {accountInfo.accountId}</span>
							</div>
							<div className="flex items-center gap-1">
								<MapPin className="h-3 w-3" />
								<span>Region: {accountInfo.region}</span>
							</div>
							<div className="flex items-center gap-1">
								<Badge variant="outline" className="text-xs">
									{accountInfo.profile}
								</Badge>
							</div>
						</div>
					)}
				</div>
				<div className="flex gap-2">
					<ExportButton />
					<Button onClick={handleRefresh} variant="outline">
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Stats Grid */}
			<StatGrid>
				<StatCard
					title="Total Resources"
					value={totalResources.toLocaleString()}
					description="Active resources"
					icon={Server}
				/>
				<StatCard
					title="Migration Progress"
					value={`${progressPercentage}%`}
					description={`${mappedResources} mapped`}
					icon={GitBranch}
				/>
				<StatCard
					title="In Progress"
					value={statusCounts.inProgress}
					description="Currently migrating"
					icon={Clock}
				/>
				<StatCard
					title="Services"
					value={generalStats.resourcesByType?.length || 0}
					description="Resource types"
					icon={Package}
				/>
			</StatGrid>

			{/* Resources by Type */}
			<Card>
				<CardHeader>
					<CardTitle>Resources by Type</CardTitle>
					<CardDescription>
						Count of each AWS resource type in your infrastructure
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Summary stats */}
						<div className="flex items-center justify-between text-muted-foreground text-sm">
							<span>
								Total resource types:{" "}
								{generalStats.resourcesByType?.length || 0}
							</span>
							<span>Total resources: {generalStats.totalResources || 0}</span>
						</div>

						{/* All resource types grid */}
						<div className="grid max-h-[600px] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
							{(generalStats.resourcesByType || [])
								.sort((a, b) => b.count - a.count)
								.map(({ type, count }) => {
									const category = resourceCategoryMapping[type] || "Other";
									const Icon = categoryIcons[category] || Server;
									const color = categoryColors[category] || "bg-gray-500";

									return (
										<div
											key={type}
											className="cursor-pointer rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
											title={`${formatResourceType(type)}: ${count} resources`}
										>
											<div className="mb-1 flex items-center gap-2">
												<Icon
													className={`h-4 w-4 ${color.replace("bg-", "text-")}`}
												/>
												<p className="truncate font-medium text-sm">
													{formatResourceType(type)}
												</p>
											</div>
											<p className="font-bold text-2xl">{count}</p>
											<p className="text-muted-foreground text-xs">
												{category}
											</p>
										</div>
									);
								})}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Migration Overview Card */}
			<Card>
				<CardHeader>
					<CardTitle>Migration Overview</CardTitle>
					<CardDescription>
						Track your infrastructure migration from manual to Terraform
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<div className="mb-2 flex items-center justify-between">
								<span className="font-medium text-sm">Overall Progress</span>
								<span className="text-muted-foreground text-sm">
									{progressPercentage}%
								</span>
							</div>
							<Progress value={progressPercentage} className="h-2" />
						</div>

						<div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-4">
							<div className="space-y-2">
								<p className="text-muted-foreground text-sm">
									Critical Priority
								</p>
								<div className="flex items-center space-x-2">
									<AlertCircle className="h-4 w-4 text-red-500" />
									<span className="font-semibold">
										{migrationStats.byPriority?.find(
											(p) => p.priority === "critical",
										)?.count || 0}
									</span>
								</div>
							</div>
							<div className="space-y-2">
								<p className="text-muted-foreground text-sm">High Priority</p>
								<div className="flex items-center space-x-2">
									<TrendingUp className="h-4 w-4 text-orange-500" />
									<span className="font-semibold">
										{migrationStats.byPriority?.find(
											(p) => p.priority === "high",
										)?.count || 0}
									</span>
								</div>
							</div>
							<div className="space-y-2">
								<p className="text-muted-foreground text-sm">Verified</p>
								<div className="flex items-center space-x-2">
									<CheckCircle className="h-4 w-4 text-green-500" />
									<span className="font-semibold">{statusCounts.verified}</span>
								</div>
							</div>
							<div className="space-y-2">
								<p className="text-muted-foreground text-sm">Not Started</p>
								<div className="flex items-center space-x-2">
									<Clock className="h-4 w-4 text-gray-500" />
									<span className="font-semibold">
										{statusCounts.notStarted}
									</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Service Distribution */}
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Resources by Service</CardTitle>
						<CardDescription>
							Top AWS services by resource count
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{(generalStats.resourcesByType || [])
								.slice(0, 6)
								.map((service) => {
									const percentage =
										totalResources > 0
											? Math.round((service.count / totalResources) * 100)
											: 0;
									return (
										<div key={service.type} className="space-y-1">
											<div className="flex items-center justify-between">
												<span className="font-medium text-sm">
													{formatResourceType(service.type)}
												</span>
												<div className="flex items-center gap-2">
													<Badge variant="secondary">{service.count}</Badge>
													<span className="text-muted-foreground text-sm">
														{percentage}%
													</span>
												</div>
											</div>
											<Progress value={percentage} className="h-2" />
										</div>
									);
								})}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Migration Status</CardTitle>
						<CardDescription>Current status of all resources</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{(migrationStats.byStatus || []).map(({ status, count }) => {
								const percentage =
									totalResources > 0
										? Math.round((count / totalResources) * 100)
										: 0;
								const statusConfig = {
									not_started: { label: "Not Started", color: "bg-gray-500" },
									in_progress: { label: "In Progress", color: "bg-yellow-500" },
									migrated: { label: "Migrated", color: "bg-blue-500" },
									verified: { label: "Verified", color: "bg-green-500" },
									excluded: { label: "Excluded", color: "bg-gray-400" },
									deprecated: { label: "Deprecated", color: "bg-red-500" },
									rollback: { label: "Rollback", color: "bg-red-500" },
								};
								const config =
									statusConfig[status as keyof typeof statusConfig];
								if (!config) return null;

								return (
									<div
										key={status}
										className="flex items-center justify-between"
									>
										<div className="flex items-center gap-2">
											<div className={`h-3 w-3 rounded-full ${config.color}`} />
											<span className="text-sm">{config.label}</span>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant="outline">{count}</Badge>
											<span className="min-w-[40px] text-right text-muted-foreground text-sm">
												{percentage}%
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
