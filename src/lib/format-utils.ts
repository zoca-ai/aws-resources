/**
 * Format AWS resource type string for display
 * Examples:
 *  - "AWS::EC2::Instance" -> "Instance"
 *  - "ec2-instance" -> "EC2 Instance"
 *  - "s3-bucket" -> "S3 Bucket"
 *  - "iam-role" -> "IAM Role"
 */
export function formatResourceType(type: string): string {
	if (!type) return "";

	// Handle AWS CloudFormation format (AWS::Service::Resource)
	if (type.includes("::")) {
		return type.split("::").pop() || type;
	}

	// Handle kebab-case format (service-resource)
	if (type.includes("-")) {
		const parts = type.split("-");

		// Special handling for common acronyms
		const acronyms: Record<string, string> = {
			ec2: "EC2",
			s3: "S3",
			iam: "IAM",
			rds: "RDS",
			ecs: "ECS",
			ecr: "ECR",
			sns: "SNS",
			sqs: "SQS",
			vpc: "VPC",
			ebs: "EBS",
			ami: "AMI",
			api: "API",
			nat: "NAT",
			alb: "ALB",
			nlb: "NLB",
			elb: "ELB",
		};

		return parts
			.map((part) => {
				const lowerPart = part.toLowerCase();
				return (
					acronyms[lowerPart] || part.charAt(0).toUpperCase() + part.slice(1)
				);
			})
			.join(" ");
	}

	// Default: just capitalize first letter
	return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Format AWS region code for display
 * Examples:
 *  - "us-east-1" -> "US East (N. Virginia)"
 *  - "eu-west-1" -> "EU West (Ireland)"
 */
export function formatRegion(region: string): string {
	const regionNames: Record<string, string> = {
		"us-east-1": "US East (N. Virginia)",
		"us-east-2": "US East (Ohio)",
		"us-west-1": "US West (N. California)",
		"us-west-2": "US West (Oregon)",
		"ap-south-1": "Asia Pacific (Mumbai)",
		"ap-northeast-1": "Asia Pacific (Tokyo)",
		"ap-northeast-2": "Asia Pacific (Seoul)",
		"ap-northeast-3": "Asia Pacific (Osaka)",
		"ap-southeast-1": "Asia Pacific (Singapore)",
		"ap-southeast-2": "Asia Pacific (Sydney)",
		"ca-central-1": "Canada (Central)",
		"eu-central-1": "EU (Frankfurt)",
		"eu-west-1": "EU (Ireland)",
		"eu-west-2": "EU (London)",
		"eu-west-3": "EU (Paris)",
		"eu-north-1": "EU (Stockholm)",
		"sa-east-1": "South America (São Paulo)",
	};

	return regionNames[region] || region;
}

/**
 * Get short region code for display (when space is limited)
 * Examples:
 *  - "us-east-1" -> "US-E1"
 *  - "eu-west-1" -> "EU-W1"
 */
export function getShortRegion(region: string): string {
	if (!region) return "";

	const parts = region.split("-");
	if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
		const area = parts[0].toUpperCase();
		const direction = parts[1].charAt(0).toUpperCase();
		const number = parts[2];
		return `${area}-${direction}${number}`;
	}
	return region.toUpperCase();
}

/**
 * Format service category name
 * Examples:
 *  - "migrate_terraform" -> "Migrate to Terraform"
 *  - "keep_manual" -> "Keep Manual"
 */
export function formatCategory(category: string): string {
	if (!category) return "";

	return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format status string
 * Examples:
 *  - "not_started" -> "Not Started"
 *  - "in_progress" -> "In Progress"
 */
export function formatStatus(status: string): string {
	if (!status) return "";

	return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
