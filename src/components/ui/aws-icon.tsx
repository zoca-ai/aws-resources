import { cn } from "@/lib/utils";
import {
	Box,
	Cloud,
	Database,
	Lock,
	Network,
	Server,
	Settings,
} from "lucide-react";
import type React from "react";

import AppLoadBalancerIcon from "react-aws-icons/dist/aws/compute/AppLoadBalancer.js";
import AutoScalingIcon from "react-aws-icons/dist/aws/compute/AutoScaling.js";
import ECRIcon from "react-aws-icons/dist/aws/compute/ECR.js";
import ACMIcon from "react-aws-icons/dist/aws/logo/ACM.js";
import APIGatewayIcon from "react-aws-icons/dist/aws/logo/APIGateway.js";
import AthenaIcon from "react-aws-icons/dist/aws/logo/Athena.js";
import CloudFormationIcon from "react-aws-icons/dist/aws/logo/CloudFormation.js";
import CloudFrontIcon from "react-aws-icons/dist/aws/logo/CloudFront.js";
import CloudWatchIcon from "react-aws-icons/dist/aws/logo/CloudWatch.js";
import CodeBuildIcon from "react-aws-icons/dist/aws/logo/CodeBuild.js";
import CodePipelineIcon from "react-aws-icons/dist/aws/logo/CodePipeline.js";
import CognitoIcon from "react-aws-icons/dist/aws/logo/Cognito.js";
import DynamoDBIcon from "react-aws-icons/dist/aws/logo/DynamoDB.js";
// AWS icon imports - static imports for better bundling and performance
import EC2Icon from "react-aws-icons/dist/aws/logo/EC2.js";
import ECSIcon from "react-aws-icons/dist/aws/logo/ECS.js";
import ELBIcon from "react-aws-icons/dist/aws/logo/ELB.js";
import ElasticCacheIcon from "react-aws-icons/dist/aws/logo/ElasticCache.js";
import GlueIcon from "react-aws-icons/dist/aws/logo/Glue.js";
import IAMIcon from "react-aws-icons/dist/aws/logo/IAM.js";
import KMSIcon from "react-aws-icons/dist/aws/logo/KMS.js";
import KinesisIcon from "react-aws-icons/dist/aws/logo/Kinesis.js";
import LambdaIcon from "react-aws-icons/dist/aws/logo/Lambda.js";
import MachineLearningIcon from "react-aws-icons/dist/aws/logo/MachineLearning.js";
import RDSIcon from "react-aws-icons/dist/aws/logo/RDS.js";
import RedshiftIcon from "react-aws-icons/dist/aws/logo/Redshift.js";
import Route53Icon from "react-aws-icons/dist/aws/logo/Route53.js";
import S3Icon from "react-aws-icons/dist/aws/logo/S3.js";
import SNSIcon from "react-aws-icons/dist/aws/logo/SNS.js";
import SQSIcon from "react-aws-icons/dist/aws/logo/SQS.js";
import SystemsManagerIcon from "react-aws-icons/dist/aws/logo/SystemsManager.js";
import VPCIcon from "react-aws-icons/dist/aws/logo/VPC.js";
import EBSIcon from "react-aws-icons/dist/aws/storage/EBS.js";

interface AwsIconProps {
	resourceType: string;
	className?: string;
	size?: number;
	fallback?: "lucide" | "initials" | "generic";
}

// Mapping of AWS resource types to imported icon components
const AWS_ICON_MAPPING: Record<string, React.ComponentType<any>> = {
	// Compute Services
	"AWS::EC2::Instance": EC2Icon,
	"AWS::EC2::Volume": EBSIcon,
	"AWS::EC2::SecurityGroup": EC2Icon,
	"AWS::EC2::KeyPair": EC2Icon,
	"AWS::EC2::VPC": VPCIcon,
	"AWS::EC2::Subnet": VPCIcon,
	"AWS::EC2::InternetGateway": VPCIcon,
	"AWS::EC2::RouteTable": VPCIcon,
	"AWS::EC2::NetworkInterface": EC2Icon,
	"AWS::Lambda::Function": LambdaIcon,
	"AWS::AutoScaling::AutoScalingGroup": AutoScalingIcon,
	"AWS::ECS::Cluster": ECSIcon,
	"AWS::ECS::Service": ECSIcon,
	"AWS::ECS::TaskDefinition": ECSIcon,

	// Storage Services
	"AWS::S3::Bucket": S3Icon,
	"AWS::EBS::Volume": EBSIcon,
	"AWS::S3::Object": S3Icon,

	// Database Services
	"AWS::RDS::DBInstance": RDSIcon,
	"AWS::RDS::DBCluster": RDSIcon,
	"AWS::DynamoDB::Table": DynamoDBIcon,
	"AWS::ElastiCache::CacheCluster": ElasticCacheIcon,
	"AWS::Redshift::Cluster": RedshiftIcon,

	// Networking & Content Delivery
	"AWS::ElasticLoadBalancing::LoadBalancer": ELBIcon,
	"AWS::ElasticLoadBalancingV2::LoadBalancer": AppLoadBalancerIcon,
	"AWS::ElasticLoadBalancingV2::TargetGroup": AppLoadBalancerIcon,
	"AWS::Route53::HostedZone": Route53Icon,
	"AWS::Route53::RecordSet": Route53Icon,
	"AWS::CloudFront::Distribution": CloudFrontIcon,
	"AWS::ApiGateway::RestApi": APIGatewayIcon,
	"AWS::ApiGatewayV2::Api": APIGatewayIcon,

	// Security & Identity
	"AWS::IAM::Role": IAMIcon,
	"AWS::IAM::User": IAMIcon,
	"AWS::IAM::Policy": IAMIcon,
	"AWS::IAM::Group": IAMIcon,
	"AWS::KMS::Key": KMSIcon,
	"AWS::SecretsManager::Secret": SystemsManagerIcon,
	"AWS::SSM::Parameter": SystemsManagerIcon,
	"AWS::CertificateManager::Certificate": ACMIcon,
	"AWS::Cognito::UserPool": CognitoIcon,

	// Analytics
	"AWS::Kinesis::Stream": KinesisIcon,
	"AWS::Kinesis::DeliveryStream": KinesisIcon,
	"AWS::Glue::Job": GlueIcon,
	"AWS::Athena::WorkGroup": AthenaIcon,

	// Application Integration
	"AWS::SNS::Topic": SNSIcon,
	"AWS::SQS::Queue": SQSIcon,

	// Management & Governance
	"AWS::CloudWatch::Alarm": CloudWatchIcon,
	"AWS::CloudWatch::Dashboard": CloudWatchIcon,
	"AWS::CloudFormation::Stack": CloudFormationIcon,

	// Developer Tools
	"AWS::CodeBuild::Project": CodeBuildIcon,
	"AWS::CodePipeline::Pipeline": CodePipelineIcon,

	// Machine Learning
	"AWS::SageMaker::Endpoint": MachineLearningIcon,
	"AWS::SageMaker::Model": MachineLearningIcon,
	"AWS::SageMaker::NotebookInstance": MachineLearningIcon,
};

// Hyphenated resource type mappings (common formats)
const HYPHENATED_RESOURCE_MAPPING: Record<string, React.ComponentType<any>> = {
	"route53-record-set": Route53Icon,
	"route53-hosted-zone": Route53Icon,
	"ecs-task-definition": ECSIcon,
	"ecs-task": ECSIcon,
	"ecs-service": ECSIcon,
	"ecs-cluster": ECSIcon,
	"s3-bucket": S3Icon,
	"ecr-repository": ECRIcon,
	"lambda-function": LambdaIcon,
	"lambda-layer": LambdaIcon,
	"lambda-event-source-mapping": LambdaIcon,
	"rds-snapshot": RDSIcon,
	"rds-cluster-snapshot": RDSIcon,
	"rds-instance": RDSIcon,
	"rds-cluster": RDSIcon,
	"rds-subnet-group": RDSIcon,
	"cloudformation-stack": CloudFormationIcon,
	"api-gateway-stage": APIGatewayIcon,
	"api-gateway-rest-api": APIGatewayIcon,
	"target-group": AppLoadBalancerIcon,
	"load-balancer": ELBIcon,
	"cloudfront-distribution": CloudFrontIcon,
	"sns-topic": SNSIcon,
	"sns-subscription": SNSIcon,
	"dynamodb-table": DynamoDBIcon,
	vpc: VPCIcon,
	"ec2-instance": EC2Icon,
	"security-group": EC2Icon,
};

// Service name fallback mappings
const SERVICE_FALLBACK_MAPPING: Record<string, React.ComponentType<any>> = {
	ec2: EC2Icon,
	lambda: LambdaIcon,
	s3: S3Icon,
	rds: RDSIcon,
	dynamodb: DynamoDBIcon,
	vpc: VPCIcon,
	elb: ELBIcon,
	alb: AppLoadBalancerIcon,
	nlb: AppLoadBalancerIcon,
	route53: Route53Icon,
	cloudfront: CloudFrontIcon,
	iam: IAMIcon,
	kms: KMSIcon,
	cloudwatch: CloudWatchIcon,
	cloudformation: CloudFormationIcon,
	sns: SNSIcon,
	sqs: SQSIcon,
	apigateway: APIGatewayIcon,
	"api-gateway": APIGatewayIcon,
	kinesis: KinesisIcon,
	glue: GlueIcon,
	athena: AthenaIcon,
	redshift: RedshiftIcon,
	sagemaker: MachineLearningIcon,
	codebuild: CodeBuildIcon,
	codepipeline: CodePipelineIcon,
	ecs: ECSIcon,
	ecr: ECRIcon,
	elasticache: ElasticCacheIcon,
	secretsmanager: SystemsManagerIcon,
	"systems-manager": SystemsManagerIcon,
	ssm: SystemsManagerIcon,
	certificatemanager: ACMIcon,
	cognito: CognitoIcon,
};

// Generate initials from resource type
function getResourceInitials(resourceType: string): string {
	const cleaned = resourceType.replace(/^AWS::/, "").replace(/::/g, " ");
	const words = cleaned.split(/[\s\-_]/).filter(Boolean);

	if (words.length >= 2) {
		return words
			.slice(0, 2)
			.map((word) => word.charAt(0).toUpperCase())
			.join("");
	}

	return (
		cleaned.charAt(0).toUpperCase() + (cleaned.charAt(1) || "").toUpperCase()
	);
}

// Get fallback lucide icon based on resource category
function getFallbackLucideIcon(resourceType: string) {
	const type = resourceType.toLowerCase();

	if (
		type.includes("database") ||
		type.includes("rds") ||
		type.includes("dynamodb")
	) {
		return Database;
	}
	if (
		type.includes("network") ||
		type.includes("vpc") ||
		type.includes("route") ||
		type.includes("gateway")
	) {
		return Network;
	}
	if (
		type.includes("security") ||
		type.includes("iam") ||
		type.includes("kms") ||
		type.includes("secret")
	) {
		return Lock;
	}
	if (
		type.includes("compute") ||
		type.includes("ec2") ||
		type.includes("lambda")
	) {
		return Server;
	}
	if (type.includes("storage") || type.includes("s3") || type.includes("ebs")) {
		return Box;
	}
	if (type.includes("cloud") || type.includes("service")) {
		return Cloud;
	}

	return Settings; // Default fallback
}

// Find AWS icon component for a resource type
function findAwsIconComponent(
	resourceType: string,
): React.ComponentType<any> | null {
	// Direct match for AWS CloudFormation format
	if (AWS_ICON_MAPPING[resourceType]) {
		return AWS_ICON_MAPPING[resourceType];
	}

	// Direct match for hyphenated format
	if (HYPHENATED_RESOURCE_MAPPING[resourceType]) {
		return HYPHENATED_RESOURCE_MAPPING[resourceType];
	}

	// Try service name extraction and matching
	const serviceName = extractServiceName(resourceType);
	if (serviceName && SERVICE_FALLBACK_MAPPING[serviceName]) {
		return SERVICE_FALLBACK_MAPPING[serviceName];
	}

	// Try partial matches
	const lowerType = resourceType.toLowerCase();
	for (const [key, IconComponent] of Object.entries(SERVICE_FALLBACK_MAPPING)) {
		if (lowerType.includes(key)) {
			return IconComponent;
		}
	}

	return null;
}

// Static AWS icon component
const StaticAwsIcon = ({
	IconComponent,
	className,
	size,
	resourceType,
	fallback = "lucide",
}: {
	IconComponent: React.ComponentType<any>;
	className?: string;
	size: number;
	resourceType: string;
	fallback?: "lucide" | "initials" | "generic";
}) => {
	try {
		return (
			<IconComponent
				className={cn("inline-block", className)}
				size={size}
				style={{
					width: size,
					height: size,
					minWidth: size,
					minHeight: size,
				}}
			/>
		);
	} catch (error) {
		console.warn(`Failed to render AWS icon for ${resourceType}:`, error);

		// Fall back to the original fallback logic
		switch (fallback) {
			case "initials":
				return (
					<div
						className={cn(
							"inline-flex items-center justify-center rounded bg-muted font-bold font-mono text-muted-foreground text-xs",
							className,
						)}
						style={{
							width: size,
							height: size,
							fontSize: Math.max(8, size * 0.4),
						}}
					>
						{getResourceInitials(resourceType)}
					</div>
				);

			case "generic":
				return (
					<div
						className={cn(
							"inline-flex items-center justify-center rounded bg-orange-100 text-orange-600",
							className,
						)}
						style={{ width: size, height: size }}
					>
						<Box size={Math.max(12, size * 0.6)} />
					</div>
				);
			default: {
				const LucideIcon = getFallbackLucideIcon(resourceType);
				return (
					<LucideIcon
						size={size}
						className={cn("text-muted-foreground", className)}
					/>
				);
			}
		}
	}
};

// Extract service name from resource type
function extractServiceName(resourceType: string): string | null {
	const type = resourceType.toLowerCase();

	// AWS service matches
	const awsServiceMatch = type.match(/^aws::([^:]+)::/);
	if (awsServiceMatch && awsServiceMatch[1]) {
		const serviceName = awsServiceMatch[1];
		// Map common AWS service names
		const serviceMap: Record<string, string> = {
			apigateway: "api-gateway",
			apigatewayv2: "api-gateway",
			autoscaling: "auto-scaling",
			elasticloadbalancing: "elb",
			elasticloadbalancingv2: "alb",
			certificatemanager: "certificatemanager",
			secretsmanager: "secretsmanager",
			stepfunctions: "stepfunctions",
		};
		return serviceMap[serviceName] || serviceName;
	}

	// Handle hyphenated formats
	for (const service of Object.keys(SERVICE_FALLBACK_MAPPING)) {
		if (type.includes(service)) {
			return service;
		}
	}

	return null;
}

export const AwsIcon = ({
	resourceType,
	className,
	size = 20,
	fallback = "lucide",
}: AwsIconProps) => {
	const IconComponent = findAwsIconComponent(resourceType);

	if (IconComponent) {
		return (
			<StaticAwsIcon
				IconComponent={IconComponent}
				className={className}
				size={size}
				resourceType={resourceType}
				fallback={fallback}
			/>
		);
	}

	// Fallback rendering when no AWS icon is found
	switch (fallback) {
		case "initials":
			return (
				<div
					className={cn(
						"inline-flex items-center justify-center rounded bg-muted font-bold font-mono text-muted-foreground text-xs",
						className,
					)}
					style={{
						width: size,
						height: size,
						fontSize: Math.max(8, size * 0.4),
					}}
				>
					{getResourceInitials(resourceType)}
				</div>
			);

		case "generic":
			return (
				<div
					className={cn(
						"inline-flex items-center justify-center rounded bg-orange-100 text-orange-600",
						className,
					)}
					style={{ width: size, height: size }}
				>
					<Box size={Math.max(12, size * 0.6)} />
				</div>
			);
		default: {
			const LucideIcon = getFallbackLucideIcon(resourceType);
			return (
				<LucideIcon
					size={size}
					className={cn("text-muted-foreground", className)}
				/>
			);
		}
	}
};

// Hook for checking if an AWS icon exists
export function useAwsIcon(resourceType: string) {
	const IconComponent = findAwsIconComponent(resourceType);
	return {
		hasIcon: !!IconComponent,
		IconComponent: IconComponent,
	};
}
