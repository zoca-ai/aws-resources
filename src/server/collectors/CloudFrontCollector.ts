import { getAWSClientConfig } from "@/server/config/aws";
import {
  CloudFrontClient,
  type Distribution,
  type DistributionList,
  ListDistributionsCommand,
  ListTagsForResourceCommand,
  type Tag,
} from "@aws-sdk/client-cloudfront";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class CloudFrontCollector extends BaseCollector {
  private accountId: string | null = null;

  static getMetadata(): ResourceMetadata {
    return {
      id: "cloudfront",
      name: "CloudFront",
      description: "CDN distributions",
      category: "Networking",
      icon: "Globe",
      resources: ["distributions"],
    };
  }

  constructor() {
    // Client will be initialized in collect() with proper credentials
    // CloudFront is global service, use 'global' as region
    super("global", null, "cloudfront-distribution");
  }

  private async initializeClient(): Promise<void> {
    if (!this.client) {
      const config = await getAWSClientConfig();
      this.client = new CloudFrontClient({
        region: "us-east-1", // CloudFront API is accessed via us-east-1
        credentials: config.credentials,
      });
    }
  }

  async collect(): Promise<any[]> {
    this.logger.info("Starting CloudFront distribution collection...");

    // Initialize client with proper credentials
    await this.initializeClient();
    this.accountId = await this.getAccountId();

    try {
      await this.collectDistributions();
      this.logger.info(
        `Collected ${this.resources.length} CloudFront distributions`,
      );
      return this.resources;
    } catch (error: any) {
      this.logger.error("CloudFront collection failed:", error);
      this.errors.push(error.message);
      throw error;
    }
  }

  private async collectDistributions(): Promise<void> {
    let marker: string | undefined;

    do {
      try {
        const command = new ListDistributionsCommand({
          Marker: marker,
          MaxItems: 100,
        });
        const response = await this.client.send(command);

        if (!response.DistributionList?.Items) break;

        for (const distribution of response.DistributionList.Items) {
          if (!distribution.ARN || !distribution.Id) continue;

          const tags = await this.getDistributionTags(distribution.ARN);

          const resource = this.createResourceObject({
            id: distribution.ARN,
            arn: distribution.ARN,
            name: distribution.DomainName,
            accountId: this.accountId || undefined,
            region: "global", // CloudFront is global
            status: distribution.Status,
            createdAt: distribution.LastModifiedTime,
            tags: this.extractTags(tags),
            properties: {
              distributionId: distribution.Id,
              domainName: distribution.DomainName,
              status: distribution.Status,
              priceClass: distribution.PriceClass,
              enabled: distribution.Enabled,
              httpVersion: distribution.HttpVersion,
              isIPV6Enabled: distribution.IsIPV6Enabled,
              webAclId: distribution.WebACLId,
              originCount: distribution.Origins?.Items?.length || 0,
              aliasCount: distribution.Aliases?.Items?.length || 0,
              comment: distribution.Comment,
              defaultRootObject: distribution.DefaultRootObject,
              cacheBehaviors:
                distribution.CacheBehaviors?.Items?.map((behavior: any) => ({
                  pathPattern: behavior.PathPattern,
                  targetOriginId: behavior.TargetOriginId,
                  viewerProtocolPolicy: behavior.ViewerProtocolPolicy,
                  compress: behavior.Compress,
                  cachePolicyId: behavior.CachePolicyId,
                  originRequestPolicyId: behavior.OriginRequestPolicyId,
                  responseHeadersPolicyId: behavior.ResponseHeadersPolicyId,
                })) || [],
              origins:
                distribution.Origins?.Items?.map((origin: any) => ({
                  id: origin.Id,
                  domainName: origin.DomainName,
                  originPath: origin.OriginPath,
                  connectionAttempts: origin.ConnectionAttempts,
                  connectionTimeout: origin.ConnectionTimeout,
                })) || [],
            },
            configuration: {
              priceClass: distribution.PriceClass,
              enabled: distribution.Enabled,
              httpVersion: distribution.HttpVersion,
              defaultCacheBehavior: distribution.DefaultCacheBehavior
                ? {
                    targetOriginId:
                      distribution.DefaultCacheBehavior.TargetOriginId,
                    viewerProtocolPolicy:
                      distribution.DefaultCacheBehavior.ViewerProtocolPolicy,
                    compress: distribution.DefaultCacheBehavior.Compress,
                    cachePolicyId:
                      distribution.DefaultCacheBehavior.CachePolicyId,
                    originRequestPolicyId:
                      distribution.DefaultCacheBehavior.OriginRequestPolicyId,
                    responseHeadersPolicyId:
                      distribution.DefaultCacheBehavior.ResponseHeadersPolicyId,
                    fieldLevelEncryptionId:
                      distribution.DefaultCacheBehavior.FieldLevelEncryptionId,
                  }
                : null,
              customErrorResponses:
                distribution.CustomErrorResponses?.Items?.map(
                  (response: any) => ({
                    errorCode: response.ErrorCode,
                    responsePagePath: response.ResponsePagePath,
                    responseCode: response.ResponseCode,
                    errorCachingMinTTL: response.ErrorCachingMinTTL,
                  }),
                ) || [],
              logging: distribution.Logging
                ? {
                    enabled: distribution.Logging.Enabled,
                    includeCookies: distribution.Logging.IncludeCookies,
                    bucket: distribution.Logging.Bucket,
                    prefix: distribution.Logging.Prefix,
                  }
                : null,
              viewerCertificate: distribution.ViewerCertificate
                ? {
                    cloudFrontDefaultCertificate:
                      distribution.ViewerCertificate
                        .CloudFrontDefaultCertificate,
                    acmCertificateArn:
                      distribution.ViewerCertificate.ACMCertificateArn,
                    iamCertificateId:
                      distribution.ViewerCertificate.IAMCertificateId,
                    sslSupportMethod:
                      distribution.ViewerCertificate.SSLSupportMethod,
                    minimumProtocolVersion:
                      distribution.ViewerCertificate.MinimumProtocolVersion,
                  }
                : null,
            },
            security: {
              isPublic: true, // CloudFront distributions are inherently public
              hasWebAcl: !!distribution.WebACLId,
              viewerProtocolPolicy:
                distribution.DefaultCacheBehavior?.ViewerProtocolPolicy,
              httpsOnly:
                distribution.DefaultCacheBehavior?.ViewerProtocolPolicy ===
                  "https-only" ||
                distribution.DefaultCacheBehavior?.ViewerProtocolPolicy ===
                  "redirect-to-https",
              customSslCertificate:
                !!distribution.ViewerCertificate?.ACMCertificateArn ||
                !!distribution.ViewerCertificate?.IAMCertificateId,
              minimumTlsVersion:
                distribution.ViewerCertificate?.MinimumProtocolVersion,
            },
            cost: {
              currency: "USD",
              billingPeriod: "monthly",
              lastUpdated: new Date(),
            },
          });

          resource.resourceType = "cloudfront-distribution";

          // Add origin relationships (S3 buckets, ALBs, etc.)
          if (distribution.Origins?.Items) {
            for (const origin of distribution.Origins.Items) {
              if (origin.DomainName) {
                // Try to determine origin type and create relationship
                if (origin.DomainName.includes(".s3.")) {
                  // S3 origin
                  const bucketName = origin.DomainName.split(".")[0];
                  this.addRelationship(
                    resource,
                    "references",
                    `arn:aws:s3:::${bucketName}`,
                    "s3-bucket",
                  );
                } else if (
                  origin.DomainName.includes(".elb.") ||
                  origin.DomainName.includes(".amazonaws.com")
                ) {
                  // Load balancer origin - we'll need the actual ARN in a real implementation
                  this.addRelationship(
                    resource,
                    "references",
                    origin.DomainName,
                    "load-balancer",
                  );
                } else if (origin.DomainName.includes(".execute-api.")) {
                  // API Gateway origin
                  this.addRelationship(
                    resource,
                    "references",
                    origin.DomainName,
                    "api-gateway",
                  );
                }
              }
            }
          }

          // Add certificate relationships if using ACM
          if (distribution.ViewerCertificate?.ACMCertificateArn) {
            this.addRelationship(
              resource,
              "references",
              distribution.ViewerCertificate.ACMCertificateArn,
              "acm-certificate",
            );
          }

          // Add WAF relationship if present
          if (distribution.WebACLId) {
            this.addRelationship(
              resource,
              "references",
              distribution.WebACLId,
              "waf-web-acl",
            );
          }

          this.resources.push(resource);
        }

        marker = response.DistributionList?.NextMarker;
      } catch (error: any) {
        this.logger.error(
          `Failed to collect CloudFront distributions: ${error.message}`,
        );
        break;
      }
    } while (marker);
  }

  private async getDistributionTags(arn: string): Promise<Tag[]> {
    try {
      const response = await this.client.send(
        new ListTagsForResourceCommand({
          Resource: arn,
        }),
      );
      return response.Tags?.Items || [];
    } catch (error: any) {
      this.logger.debug(`Failed to get tags for ${arn}: ${error.message}`);
      return [];
    }
  }
}
