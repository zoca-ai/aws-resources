/**
 * Utility functions for working with AWS resources and services
 */

// Extract service name from AWS resource type
export function extractServiceName(resourceType: string): string {
	// Handle AWS CloudFormation resource types like "AWS::EC2::Instance"
	const awsMatch = resourceType.match(/^AWS::([^:]+)::/);
	if (awsMatch && awsMatch[1]) {
		return awsMatch[1];
	}

	// Handle direct service names or other formats
	return resourceType.split(/[:\-_\s]/)[0] || resourceType;
}

// Format AWS resource type for display
export function formatAwsResourceType(resourceType: string): string {
	// Handle AWS CloudFormation format
	if (resourceType.startsWith("AWS::")) {
		const parts = resourceType.split("::");
		if (parts.length >= 3 && parts[1] && parts[2]) {
			const service = parts[1];
			const resource = parts[2];

			// Format service name (e.g., "EC2" stays "EC2", "ElasticLoadBalancing" becomes "ELB")
			const formattedService = formatServiceName(service);

			// Format resource name (e.g., "DBInstance" becomes "DB Instance")
			const formattedResource = resource.replace(/([A-Z])/g, " $1").trim();

			return `${formattedService} ${formattedResource}`;
		}
	}

	// Handle other formats - add spaces before capital letters
	return resourceType.replace(/([A-Z])/g, " $1").trim();
}

// Format service names for better readability
function formatServiceName(service: string): string {
	const serviceMap: Record<string, string> = {
		EC2: "EC2",
		S3: "S3",
		RDS: "RDS",
		Lambda: "Lambda",
		DynamoDB: "DynamoDB",
		ElasticLoadBalancing: "ELB",
		ElasticLoadBalancingV2: "ALB/NLB",
		Route53: "Route 53",
		CloudFront: "CloudFront",
		ApiGateway: "API Gateway",
		ApiGatewayV2: "API Gateway v2",
		CloudFormation: "CloudFormation",
		CloudWatch: "CloudWatch",
		CloudTrail: "CloudTrail",
		IAM: "IAM",
		KMS: "KMS",
		SecretsManager: "Secrets Manager",
		CertificateManager: "ACM",
		AutoScaling: "Auto Scaling",
		ECS: "ECS",
		EKS: "EKS",
		SNS: "SNS",
		SQS: "SQS",
		StepFunctions: "Step Functions",
		CodeBuild: "CodeBuild",
		CodePipeline: "CodePipeline",
		CodeCommit: "CodeCommit",
		CodeDeploy: "CodeDeploy",
		SageMaker: "SageMaker",
		Kinesis: "Kinesis",
		Glue: "Glue",
		Athena: "Athena",
		Redshift: "Redshift",
		ElastiCache: "ElastiCache",
		DocumentDB: "DocumentDB",
		Neptune: "Neptune",
		EFS: "EFS",
		FSx: "FSx",
		Config: "Config",
		SSM: "Systems Manager",
	};

	return serviceMap[service] || service;
}

// Get AWS service category
export function getServiceCategory(resourceType: string): string {
	const service = extractServiceName(resourceType).toLowerCase();

	const categoryMap: Record<string, string> = {
		ec2: "Compute",
		lambda: "Compute",
		autoscaling: "Compute",
		ecs: "Containers",
		eks: "Containers",
		s3: "Storage",
		ebs: "Storage",
		efs: "Storage",
		fsx: "Storage",
		rds: "Database",
		dynamodb: "Database",
		elasticache: "Database",
		documentdb: "Database",
		neptune: "Database",
		redshift: "Analytics",
		vpc: "Networking",
		route53: "Networking",
		cloudfront: "Networking",
		elasticloadbalancing: "Networking",
		elasticloadbalancingv2: "Networking",
		apigateway: "App Integration",
		sns: "App Integration",
		sqs: "App Integration",
		stepfunctions: "App Integration",
		eventbridge: "App Integration",
		events: "App Integration",
		iam: "Security",
		kms: "Security",
		secretsmanager: "Security",
		certificatemanager: "Security",
		cloudwatch: "Management",
		cloudtrail: "Management",
		cloudformation: "Management",
		config: "Management",
		ssm: "Management",
		kinesis: "Analytics",
		glue: "Analytics",
		athena: "Analytics",
		sagemaker: "Machine Learning",
		codebuild: "Developer Tools",
		codepipeline: "Developer Tools",
		codecommit: "Developer Tools",
		codedeploy: "Developer Tools",
	};

	return categoryMap[service] || "Other";
}

// Get color scheme for AWS service category
export function getServiceCategoryColor(category: string): {
	bg: string;
	text: string;
	border: string;
} {
	const colorMap: Record<string, { bg: string; text: string; border: string }> =
		{
			Compute: {
				bg: "bg-orange-50",
				text: "text-orange-700",
				border: "border-orange-200",
			},
			Containers: {
				bg: "bg-purple-50",
				text: "text-purple-700",
				border: "border-purple-200",
			},
			Storage: {
				bg: "bg-green-50",
				text: "text-green-700",
				border: "border-green-200",
			},
			Database: {
				bg: "bg-blue-50",
				text: "text-blue-700",
				border: "border-blue-200",
			},
			Networking: {
				bg: "bg-indigo-50",
				text: "text-indigo-700",
				border: "border-indigo-200",
			},
			"App Integration": {
				bg: "bg-pink-50",
				text: "text-pink-700",
				border: "border-pink-200",
			},
			Security: {
				bg: "bg-red-50",
				text: "text-red-700",
				border: "border-red-200",
			},
			Management: {
				bg: "bg-gray-50",
				text: "text-gray-700",
				border: "border-gray-200",
			},
			Analytics: {
				bg: "bg-cyan-50",
				text: "text-cyan-700",
				border: "border-cyan-200",
			},
			"Machine Learning": {
				bg: "bg-emerald-50",
				text: "text-emerald-700",
				border: "border-emerald-200",
			},
			"Developer Tools": {
				bg: "bg-yellow-50",
				text: "text-yellow-700",
				border: "border-yellow-200",
			},
			Other: {
				bg: "bg-slate-50",
				text: "text-slate-700",
				border: "border-slate-200",
			},
		};

	return colorMap[category] || colorMap["Other"] || {
		bg: "bg-slate-50",
		text: "text-slate-700",
		border: "border-slate-200",
	};
}

// Check if a resource type is an AWS resource
export function isAwsResource(resourceType: string): boolean {
	return (
		resourceType.startsWith("AWS::") ||
		/^(ec2|s3|rds|lambda|dynamodb|vpc|elb|alb|nlb|route53|iam|kms|sns|sqs)/i.test(
			resourceType,
		)
	);
}

// Get AWS documentation URL for a resource type
export function getAwsDocUrl(resourceType: string): string {
	const service = extractServiceName(resourceType).toLowerCase();

	const serviceDocMap: Record<string, string> = {
		ec2: "https://docs.aws.amazon.com/ec2/",
		s3: "https://docs.aws.amazon.com/s3/",
		rds: "https://docs.aws.amazon.com/rds/",
		lambda: "https://docs.aws.amazon.com/lambda/",
		dynamodb: "https://docs.aws.amazon.com/dynamodb/",
		iam: "https://docs.aws.amazon.com/iam/",
		vpc: "https://docs.aws.amazon.com/vpc/",
		cloudformation: "https://docs.aws.amazon.com/cloudformation/",
		// Add more as needed
	};

	return serviceDocMap[service] || "https://docs.aws.amazon.com/";
}

// Parse AWS ARN
export interface ParsedArn {
	partition: string;
	service: string;
	region: string;
	accountId: string;
	resourceType?: string;
	resource: string;
}

export function parseArn(arn: string): ParsedArn | null {
	if (!arn.startsWith("arn:")) return null;

	const parts = arn.split(":");
	if (parts.length < 6) return null;

	const [, partition, service, region, accountId, ...resourceParts] = parts;

	// Validate required parts exist
	if (!partition || !service || !region || !accountId) return null;

	const resourceString = resourceParts.join(":");

	// Try to split resource type from resource (e.g., "instance/i-1234567890abcdef0")
	const resourceMatch = resourceString.match(/^([^/]+)\/(.+)$/);
	if (resourceMatch && resourceMatch[1] && resourceMatch[2]) {
		return {
			partition,
			service,
			region,
			accountId,
			resourceType: resourceMatch[1],
			resource: resourceMatch[2],
		};
	}

	return {
		partition,
		service,
		region,
		accountId,
		resource: resourceString,
	};
}
