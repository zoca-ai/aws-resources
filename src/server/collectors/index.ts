import { BaseCollector } from "./BaseCollector";
import { DynamoDBCollector } from "./DynamoDBCollector";
import { EC2Collector } from "./EC2Collector";
import { ECRCollector } from "./ECRCollector";
import { ECSCollector } from "./ECSCollector";
import { ElastiCacheCollector } from "./ElastiCacheCollector";
import { LambdaCollector } from "./LambdaCollector";
import { LoadBalancerCollector } from "./LoadBalancerCollector";
import { RDSCollector } from "./RDSCollector";
import { Route53Collector } from "./Route53Collector";
import { S3Collector } from "./S3Collector";
import { StepFunctionsCollector } from "./StepFunctionsCollector";

export interface CollectorRegistry {
	[key: string]: typeof BaseCollector;
}

// Registry of all available collectors
export const collectors: CollectorRegistry = {
	ec2: EC2Collector,
	s3: S3Collector,
	lambda: LambdaCollector,
	rds: RDSCollector,
	dynamodb: DynamoDBCollector,
	ecr: ECRCollector,
	ecs: ECSCollector,
	elasticache: ElastiCacheCollector,
	loadbalancer: LoadBalancerCollector,
	route53: Route53Collector,
	stepfunctions: StepFunctionsCollector,
};

// Get collector metadata for all collectors
export function getCollectorMetadata() {
	return Object.entries(collectors).map(([key, CollectorClass]) => ({
		key,
		...CollectorClass.getMetadata(),
	}));
}

// Create collector instance by type
export function createCollector(type: string, region?: string): BaseCollector {
	const CollectorClass = collectors[type];
	if (!CollectorClass) {
		throw new Error(`Unknown collector type: ${type}`);
	}
	return new CollectorClass(region);
}

// Get supported collector types
export function getSupportedTypes(): string[] {
	return Object.keys(collectors);
}

export {
	BaseCollector,
	EC2Collector,
	S3Collector,
	LambdaCollector,
	RDSCollector,
	DynamoDBCollector,
	ECRCollector,
	ECSCollector,
	ElastiCacheCollector,
	LoadBalancerCollector,
	Route53Collector,
	StepFunctionsCollector,
};

export type { ResourceMetadata, ResourceObject } from "./BaseCollector";
