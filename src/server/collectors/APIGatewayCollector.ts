import { getAWSClientConfig } from "@/server/config/aws";
import {
  APIGatewayClient,
  type Deployment,
  GetDeploymentsCommand,
  GetRestApisCommand,
  GetStagesCommand,
  type RestApi,
  type Stage,
} from "@aws-sdk/client-api-gateway";
import {
  type Api,
  ApiGatewayV2Client,
  GetApisCommand,
  GetStagesCommand as GetV2StagesCommand,
  type Stage as V2Stage,
} from "@aws-sdk/client-apigatewayv2";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class APIGatewayCollector extends BaseCollector {
  private v2Client: ApiGatewayV2Client | null = null;
  private accountId: string | null = null;

  static getMetadata(): ResourceMetadata {
    return {
      id: "apigateway",
      name: "API Gateway",
      description: "REST & HTTP APIs",
      category: "Networking",
      icon: "Network",
      resources: ["REST APIs", "HTTP APIs", "stages"],
    };
  }

  constructor(region = "us-east-1") {
    // Client will be initialized in collect() with proper credentials
    super(region, null, "api-gateway-rest-api");
  }

  private async initializeClients() {
    if (!this.client || !this.v2Client) {
      const config = await getAWSClientConfig();
      this.client = new APIGatewayClient({
        region: config.region,
        credentials: config.credentials,
      });
      this.v2Client = new ApiGatewayV2Client({
        region: config.region,
        credentials: config.credentials,
      });
    }
  }

  async collect() {
    this.logger.info("Starting API Gateway collection...");

    // Initialize clients with proper credentials
    await this.initializeClients();
    this.accountId = await this.getAccountId();

    try {
      await Promise.all([this.collectRestAPIs(), this.collectHTTPAPIs()]);

      this.logger.info(
        `Collected ${this.resources.length} API Gateway resources`,
      );
      return this.resources;
    } catch (error: any) {
      this.logger.error("API Gateway collection failed:", error);
      this.errors.push(error.message);
      throw error;
    }
  }

  private async collectRestAPIs() {
    try {
      let position: string | undefined;

      do {
        const command = new GetRestApisCommand({
          position,
          limit: 100,
        });
        const response = await this.client.send(command);

        for (const api of response.items || []) {
          if (!api.id || !api.name) continue;

          const [stages, deployments] = await Promise.all([
            this.getRestApiStages(api.id),
            this.getRestApiDeployments(api.id),
          ]);

          const resource = this.createResourceObject({
            id: `arn:aws:apigateway:${this.region}::/restapis/${api.id}`,
            arn: `arn:aws:apigateway:${this.region}::/restapis/${api.id}`,
            name: api.name,
            accountId: this.accountId || undefined,
            region: this.region,
            createdAt: api.createdDate,
            tags: this.extractTags(api.tags, "object"),
            properties: {
              apiId: api.id,
              name: api.name,
              description: api.description,
              version: api.version,
              warnings: api.warnings,
              binaryMediaTypes: api.binaryMediaTypes,
              minimumCompressionSize: api.minimumCompressionSize,
              apiKeySource: api.apiKeySource,
              endpointConfiguration: api.endpointConfiguration,
              policy: api.policy,
              disableExecuteApiEndpoint: api.disableExecuteApiEndpoint,
              stages: stages,
              deploymentsCount: deployments.length,
            },
            configuration: {
              endpointType: api.endpointConfiguration?.types?.[0],
              apiKeySource: api.apiKeySource,
              disableExecuteApiEndpoint: api.disableExecuteApiEndpoint,
            },
            security: {
              policy: api.policy ? JSON.parse(api.policy) : null,
              apiKeyRequired: api.apiKeySource === "HEADER",
            },
            cost: {
              estimated: this.estimateRestAPICost(stages.length),
              currency: "USD",
              billingPeriod: "monthly",
              lastUpdated: new Date(),
            },
          });

          this.resources.push(resource);

          // Add stages as separate resources
          for (const stage of stages) {
            if (!stage.stageName) continue;

            const stageResource = this.createResourceObject({
              id: `${api.id}-${stage.stageName}`,
              arn: `arn:aws:apigateway:${this.region}::/restapis/${api.id}/stages/${stage.stageName}`,
              name: `${api.name}-${stage.stageName}`,
              accountId: this.accountId || undefined,
              region: this.region,
              createdAt: stage.createdDate,
              modifiedAt: stage.lastUpdatedDate,
              tags: this.extractTags(stage.tags, "object"),
              properties: {
                stageName: stage.stageName,
                deploymentId: stage.deploymentId,
                description: stage.description,
                cacheClusterEnabled: stage.cacheClusterEnabled,
                cacheClusterSize: stage.cacheClusterSize,
                cacheClusterStatus: stage.cacheClusterStatus,
                variables: stage.variables,
                documentationVersion: stage.documentationVersion,
                accessLogSettings: stage.accessLogSettings,
                canarySettings: stage.canarySettings,
                tracingEnabled: stage.tracingEnabled,
                webAclArn: stage.webAclArn,
              },
              cost: {
                estimated: this.estimateAPIStageCost(stage),
                currency: "USD",
                billingPeriod: "monthly",
                lastUpdated: new Date(),
              },
            });

            stageResource.resourceType = "api-gateway-stage";

            // Add parent relationship to REST API
            this.addRelationship(
              stageResource,
              "parents",
              `arn:aws:apigateway:${this.region}::/restapis/${api.id}`,
              "api-gateway-rest-api",
            );

            this.resources.push(stageResource);
          }
        }

        position = response.position;
      } while (position);
    } catch (error: any) {
      this.logger.error("Failed to collect REST APIs:", error);
      this.errors.push(`REST APIs: ${error.message}`);
    }
  }

  private async collectHTTPAPIs() {
    try {
      let nextToken: string | undefined;

      do {
        const command = new GetApisCommand({
          NextToken: nextToken,
          MaxResults: "100",
        });
        const response = await this.v2Client?.send(command);

        if (!response) continue;

        for (const api of response.Items || []) {
          if (!api.ApiId || !api.Name) continue;

          const stages = await this.getHttpApiStages(api.ApiId);

          const resource = this.createResourceObject({
            id: `arn:aws:apigateway:${this.region}::/apis/${api.ApiId}`,
            arn: `arn:aws:apigateway:${this.region}::/apis/${api.ApiId}`,
            name: api.Name,
            accountId: this.accountId || undefined,
            region: this.region,
            createdAt: api.CreatedDate,
            tags: this.extractTags(api.Tags, "object"),
            properties: {
              apiId: api.ApiId,
              name: api.Name,
              description: api.Description,
              protocolType: api.ProtocolType,
              routeSelectionExpression: api.RouteSelectionExpression,
              apiEndpoint: api.ApiEndpoint,
              apiGatewayManaged: api.ApiGatewayManaged,
              apiKeySelectionExpression: api.ApiKeySelectionExpression,
              corsConfiguration: api.CorsConfiguration,
              disableSchemaValidation: api.DisableSchemaValidation,
              disableExecuteApiEndpoint: api.DisableExecuteApiEndpoint,
              importInfo: api.ImportInfo,
              version: api.Version,
              warnings: api.Warnings,
              stages: stages,
            },
            configuration: {
              protocolType: api.ProtocolType,
              corsConfiguration: api.CorsConfiguration,
              disableExecuteApiEndpoint: api.DisableExecuteApiEndpoint,
            },
            security: {
              corsEnabled: !!api.CorsConfiguration,
              disableExecuteApiEndpoint: api.DisableExecuteApiEndpoint,
            },
            cost: {
              estimated: this.estimateHttpAPICost(stages.length),
              currency: "USD",
              billingPeriod: "monthly",
              lastUpdated: new Date(),
            },
          });

          resource.resourceType = "api-gateway-http-api";
          this.resources.push(resource);

          // Add stages as separate resources
          for (const stage of stages) {
            if (!stage.StageName) continue;

            const stageResource = this.createResourceObject({
              id: `${api.ApiId}-${stage.StageName}`,
              arn: `arn:aws:apigateway:${this.region}::/apis/${api.ApiId}/stages/${stage.StageName}`,
              name: `${api.Name}-${stage.StageName}`,
              accountId: this.accountId || undefined,
              region: this.region,
              createdAt: stage.CreatedDate,
              modifiedAt: stage.LastUpdatedDate,
              tags: this.extractTags(stage.Tags, "object"),
              properties: {
                stageName: stage.StageName,
                deploymentId: stage.DeploymentId,
                description: stage.Description,
                stageVariables: stage.StageVariables,
                accessLogSettings: stage.AccessLogSettings,
                autoDeploy: stage.AutoDeploy,
                clientCertificateId: stage.ClientCertificateId,
                defaultRouteSettings: stage.DefaultRouteSettings,
                routeSettings: stage.RouteSettings,
              },
              cost: {
                estimated: this.estimateHttpAPIStageCost(),
                currency: "USD",
                billingPeriod: "monthly",
                lastUpdated: new Date(),
              },
            });

            stageResource.resourceType = "api-gateway-v2-stage";

            // Add parent relationship to HTTP API
            this.addRelationship(
              stageResource,
              "parents",
              `arn:aws:apigateway:${this.region}::/apis/${api.ApiId}`,
              "api-gateway-http-api",
            );

            this.resources.push(stageResource);
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);
    } catch (error: any) {
      this.logger.error("Failed to collect HTTP APIs:", error);
      this.errors.push(`HTTP APIs: ${error.message}`);
    }
  }

  private async getRestApiStages(apiId: string): Promise<Stage[]> {
    try {
      const command = new GetStagesCommand({
        restApiId: apiId,
      });
      const response = await this.client.send(command);
      return response.item || [];
    } catch (error: any) {
      this.logger.debug(
        `Could not get stages for API ${apiId}:`,
        error.message,
      );
      return [];
    }
  }

  private async getRestApiDeployments(apiId: string): Promise<Deployment[]> {
    try {
      const command = new GetDeploymentsCommand({
        restApiId: apiId,
        limit: 100,
      });
      const response = await this.client.send(command);
      return response.items || [];
    } catch (error: any) {
      this.logger.debug(
        `Could not get deployments for API ${apiId}:`,
        error.message,
      );
      return [];
    }
  }

  private async getHttpApiStages(apiId: string): Promise<V2Stage[]> {
    try {
      const command = new GetV2StagesCommand({
        ApiId: apiId,
      });
      const response = await this.v2Client?.send(command);
      if (!response) throw Error;
      return response.Items || [];
    } catch (error: any) {
      this.logger.debug(
        `Could not get stages for HTTP API ${apiId}:`,
        error.message,
      );
      return [];
    }
  }

  private estimateRestAPICost(stageCount: number): number {
    // REST API pricing: $3.50 per million API calls
    // Assume 10k calls per month per stage
    const callsPerMonth = stageCount * 10000;
    const cost = (callsPerMonth / 1000000) * 3.5;
    return Math.max(cost, 0.01); // Minimum $0.01
  }

  private estimateHttpAPICost(stageCount: number): number {
    // HTTP API pricing: $1.00 per million API calls
    // Assume 10k calls per month per stage
    const callsPerMonth = stageCount * 10000;
    const cost = (callsPerMonth / 1000000) * 1.0;
    return Math.max(cost, 0.01); // Minimum $0.01
  }

  private estimateAPIStageCost(stage: Stage): number {
    // Cache cluster costs if enabled
    if (stage.cacheClusterEnabled) {
      const cacheSize = stage.cacheClusterSize || "0.5";
      const cacheCosts: Record<string, number> = {
        "0.5": 16.8, // cache.t3.micro
        "1.6": 33.6, // cache.t3.small
        "3.22": 67.2, // cache.t3.medium
        "6.05": 134.4, // cache.m5.large
        "13.3": 268.8, // cache.m5.xlarge
      };
      return cacheCosts[cacheSize] || 16.8;
    }
    return 0.01;
  }

  private estimateHttpAPIStageCost(): number {
    return 0.01; // HTTP API stages don't have additional costs beyond calls
  }
}
