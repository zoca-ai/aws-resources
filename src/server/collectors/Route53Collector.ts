import { getAWSClientConfig } from "@/server/config/aws";
import {
  type HostedZone,
  ListHostedZonesCommand,
  ListResourceRecordSetsCommand,
  ListTagsForResourceCommand,
  type ResourceRecordSet,
  Route53Client,
  type Tag,
} from "@aws-sdk/client-route-53";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class Route53Collector extends BaseCollector {
  private accountId: string | null = null;

  static getMetadata(): ResourceMetadata {
    return {
      id: "route53",
      name: "Route53",
      description: "DNS zones & records",
      category: "Networking",
      icon: "Globe",
      resources: ["hosted zones", "records"],
    };
  }

  constructor(region = "global") {
    // Client will be initialized in collect() with proper credentials
    // Route53 is global but we use us-east-1 for the client
    super("global", null, "route53-hosted-zone");
  }

  private async initializeClient() {
    if (!this.client) {
      const config = await getAWSClientConfig();
      this.client = new Route53Client({
        region: "us-east-1", // Route53 operations use us-east-1
        credentials: config.credentials,
      });
    }
  }

  async collect() {
    this.logger.info("Starting Route53 hosted zone collection...");

    // Initialize client with proper credentials
    await this.initializeClient();
    this.accountId = await this.getAccountId();

    try {
      await this.collectHostedZones();
      this.logger.info(`Collected ${this.resources.length} Route53 resources`);
      return this.resources;
    } catch (error: any) {
      this.logger.error("Route53 collection failed:", error);
      this.errors.push(error.message);
      throw error;
    }
  }

  private async collectHostedZones() {
    try {
      let marker: string | undefined;

      do {
        const command = new ListHostedZonesCommand({});
        const response = await this.client.send(command);

        for (const zone of response.HostedZones || []) {
          if (!zone.Id || !zone.Name) continue;

          const zoneId = zone.Id.replace("/hostedzone/", "");
          const [tags, recordSets] = await Promise.all([
            this.getHostedZoneTags(zone.Id),
            this.getRecordSets(zone.Id),
          ]);

          const resource = this.createResourceObject({
            id: `arn:aws:route53:::hostedzone/${zoneId}`,
            arn: `arn:aws:route53:::hostedzone/${zoneId}`,
            name: zone.Name,
            accountId: this.accountId || undefined,
            region: "global", // Route53 is global
            tags: this.extractTags(tags),
            properties: {
              hostedZoneId: zoneId,
              name: zone.Name,
              recordSetCount: zone.ResourceRecordSetCount,
              privateZone: zone.Config?.PrivateZone || false,
              comment: zone.Config?.Comment,
              callerReference: zone.CallerReference,
              linkedService: zone.LinkedService,
              recordSets: recordSets.map((rs: any) => ({
                name: rs.Name,
                type: rs.Type,
                ttl: rs.TTL,
                resourceRecords:
                  rs.ResourceRecords?.map((rr: any) => rr.Value) || [],
                aliasTarget: rs.AliasTarget
                  ? {
                      dnsName: rs.AliasTarget.DNSName,
                      hostedZoneId: rs.AliasTarget.HostedZoneId,
                      evaluateTargetHealth: rs.AliasTarget.EvaluateTargetHealth,
                    }
                  : null,
                setIdentifier: rs.SetIdentifier,
                weight: rs.Weight,
                region: rs.Region,
                geoLocation: rs.GeoLocation,
                failover: rs.Failover,
                multiValueAnswer: rs.MultiValueAnswer,
                healthCheckId: rs.HealthCheckId,
              })),
            },
            configuration: {
              privateZone: zone.Config?.PrivateZone || false,
              comment: zone.Config?.Comment,
              hostedZoneConfig: zone.Config,
              vpc: zone.VPCs?.map((vpc: any) => ({
                vpcRegion: vpc.VPCRegion,
                vpcId: vpc.VPCId,
              })),
            },
            security: {
              isPublic: !zone.Config?.PrivateZone,
              dnssecStatus: zone.Config?.DNSSECStatus || "NOT_SIGNING",
              privateZone: zone.Config?.PrivateZone || false,
            },
            cost: {
              estimated: this.estimateRoute53Cost(zone, recordSets.length),
              currency: "USD",
              billingPeriod: "monthly",
              lastUpdated: new Date(),
            },
          });

          resource.resourceType = "route53-hosted-zone";

          // Add VPC relationships for private zones
          if (zone.VPCs) {
            for (const vpc of zone.VPCs) {
              if (vpc.VPCId && vpc.VPCRegion) {
                this.addRelationship(
                  resource,
                  "parents",
                  `arn:aws:ec2:${vpc.VPCRegion}:${this.accountId}:vpc/${vpc.VPCId}`,
                  "ec2-vpc",
                );
              }
            }
          }

          // Map DNS records to their targets for infrastructure relationships
          for (const recordSet of recordSets) {
            this.mapRecordSetRelationships(resource, recordSet);
          }

          this.resources.push(resource);
        }

        marker = response.IsTruncated ? response.NextMarker : undefined;
      } while (marker);
    } catch (error: any) {
      this.logger.error("Failed to collect Route53 hosted zones:", error);
      this.errors.push(`Route53 Hosted Zones: ${error.message}`);
    }
  }

  private mapRecordSetRelationships(
    hostedZoneResource: any,
    recordSet: ResourceRecordSet,
  ) {
    if (!recordSet || !recordSet.Type) return;

    // Map CNAME and A records to their targets
    if (recordSet.Type === "CNAME" && recordSet.ResourceRecords) {
      for (const record of recordSet.ResourceRecords) {
        const target = record.Value;
        if (!target) continue;

        // CloudFront distribution
        if (target.includes(".cloudfront.net")) {
          this.addRelationship(
            hostedZoneResource,
            "references",
            target,
            "cloudfront-distribution",
          );
        }

        // Load balancer
        if (target.includes(".elb.amazonaws.com") || target.includes(".elb.")) {
          this.addRelationship(
            hostedZoneResource,
            "references",
            target,
            "load-balancer",
          );
        }

        // S3 website endpoint
        if (
          target.includes(".s3-website-") ||
          target.includes(".s3-website.")
        ) {
          const bucketName = target.split(".")[0];
          this.addRelationship(
            hostedZoneResource,
            "references",
            `arn:aws:s3:::${bucketName}`,
            "s3-bucket",
          );
        }
      }
    }

    // Map Alias records (more precise than CNAME)
    if (recordSet.AliasTarget) {
      const aliasTarget = recordSet.AliasTarget;
      const targetDnsName = aliasTarget.DNSName;
      if (!targetDnsName) return;

      // CloudFront distribution (alias)
      if (targetDnsName.includes(".cloudfront.net")) {
        this.addRelationship(
          hostedZoneResource,
          "references",
          targetDnsName,
          "cloudfront-distribution",
        );
      }

      // Application Load Balancer (alias)
      if (targetDnsName.includes(".elb.amazonaws.com")) {
        const parts = targetDnsName.split(".");
        if (parts.length >= 3 && parts[1] && parts[2] === "elb") {
          this.addRelationship(
            hostedZoneResource,
            "references",
            targetDnsName,
            "load-balancer",
          );
        }
      }

      // S3 bucket (alias for website)
      if (
        targetDnsName.includes(".s3-website-") ||
        targetDnsName.includes(".s3-website.")
      ) {
        const bucketName = targetDnsName.split(".")[0];
        this.addRelationship(
          hostedZoneResource,
          "references",
          `arn:aws:s3:::${bucketName}`,
          "s3-bucket",
        );
      }

      // API Gateway (alias)
      if (
        targetDnsName.includes(".apigateway.") ||
        targetDnsName.includes(".execute-api.")
      ) {
        this.addRelationship(
          hostedZoneResource,
          "references",
          targetDnsName,
          "api-gateway-rest-api",
        );
      }
    }
  }

  private async getRecordSets(
    hostedZoneId: string,
  ): Promise<ResourceRecordSet[]> {
    try {
      let recordSets: ResourceRecordSet[] = [];
      let startRecordName: string | undefined;
      let startRecordType: string | undefined;

      do {
        const params: any = {
          HostedZoneId: hostedZoneId,
          MaxItems: "100",
        };

        if (startRecordName) {
          params.StartRecordName = startRecordName;
          params.StartRecordType = startRecordType;
        }

        const response = await this.client.send(
          new ListResourceRecordSetsCommand(params),
        );
        recordSets = recordSets.concat(response.ResourceRecordSets || []);

        if (response.IsTruncated) {
          startRecordName = response.NextRecordName;
          startRecordType = response.NextRecordType;
        } else {
          startRecordName = undefined;
        }
      } while (startRecordName);

      // Filter out NS and SOA records for the root domain as they're not as interesting for diagrams
      return recordSets.filter(
        (rs: ResourceRecordSet) =>
          !(rs.Type === "NS" || rs.Type === "SOA") || !rs.Name?.endsWith("."),
      );
    } catch (error: any) {
      this.logger.debug(
        `Failed to get record sets for ${hostedZoneId}:`,
        error.message,
      );
      return [];
    }
  }

  private async getHostedZoneTags(hostedZoneId: string): Promise<Tag[]> {
    try {
      const response = await this.client.send(
        new ListTagsForResourceCommand({
          ResourceType: "hostedzone",
          ResourceId: hostedZoneId.replace("/hostedzone/", ""),
        }),
      );
      return response.ResourceTagSet?.Tags || [];
    } catch (error: any) {
      this.logger.debug(
        `Failed to get tags for ${hostedZoneId}:`,
        error.message,
      );
      return [];
    }
  }

  private estimateRoute53Cost(zone: HostedZone, recordCount: number): number {
    // Route53 pricing:
    // - $0.50 per hosted zone per month for first 25 zones
    // - $0.10 per hosted zone per month for additional zones
    // - Query charges vary by query type and volume

    const hostedZoneCost = 0.5; // First 25 zones

    // Additional cost for queries (estimate 1M queries per month)
    const queryCost = 0.4; // $0.40 per million queries for standard queries

    // Additional cost for health checks if any records have them
    const healthCheckCost = recordCount > 10 ? 0.5 : 0; // Estimate based on record complexity

    return hostedZoneCost + queryCost + healthCheckCost;
  }
}
