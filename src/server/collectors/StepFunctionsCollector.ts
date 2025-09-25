import { getAWSClientConfig } from "@/server/config/aws";
import {
  DescribeStateMachineCommand,
  type DescribeStateMachineCommandOutput,
  ListStateMachinesCommand,
  ListTagsForResourceCommand,
  SFNClient,
  type StateMachineListItem,
} from "@aws-sdk/client-sfn";
import { BaseCollector, type ResourceMetadata } from "./BaseCollector";

export class StepFunctionsCollector extends BaseCollector {
  private accountId: string | null = null;

  static getMetadata(): ResourceMetadata {
    return {
      id: "stepfunctions",
      name: "Step Functions",
      description: "Workflow orchestration service",
      category: "Compute",
      icon: "GitBranch",
      resources: ["state machines"],
    };
  }

  constructor(region = "us-east-1") {
    // Client will be initialized in collect() with proper credentials
    super(region, null, "step-function");
  }

  private async initializeClient() {
    if (!this.client) {
      const config = await getAWSClientConfig();
      this.client = new SFNClient({
        region: config.region,
        credentials: config.credentials,
      });
    }
  }

  async collect() {
    this.logger.info("Starting Step Functions collection...");

    // Initialize client with proper credentials
    await this.initializeClient();
    this.accountId = await this.getAccountId();

    try {
      await this.collectStateMachines();
      this.logger.info(`Collected ${this.resources.length} Step Functions`);
      return this.resources;
    } catch (error: any) {
      this.logger.error("Step Functions collection failed:", error);
      this.errors.push(error.message);
      throw error;
    }
  }

  private async collectStateMachines() {
    try {
      let nextToken: string | undefined;

      do {
        const command = new ListStateMachinesCommand({
          nextToken,
          maxResults: 100,
        });
        const response = await this.client.send(command);

        for (const stateMachine of response.stateMachines || []) {
          // Get detailed information about the state machine
          const details = await this.getStateMachineDetails(
            stateMachine.stateMachineArn!,
          );
          const tags = await this.getStateMachineTags(
            stateMachine.stateMachineArn!,
          );

          const resource = this.createResourceObject({
            id: stateMachine.stateMachineArn!,
            arn: stateMachine.stateMachineArn!,
            name: stateMachine.name,
            accountId: this.accountId || undefined,
            region: this.region,
            status: details?.status || "UNKNOWN",
            createdAt: stateMachine.creationDate,
            modifiedAt: details?.creationDate,
            tags: this.extractTags(tags),
            properties: {
              name: stateMachine.name,
              type: stateMachine.type, // STANDARD or EXPRESS
              status: details?.status,
              roleArn: details?.roleArn,
              definition: details?.definition,
              loggingConfiguration: details?.loggingConfiguration,
              tracingConfiguration: details?.tracingConfiguration,
            },
            configuration: {
              type: stateMachine.type,
              roleArn: details?.roleArn,
              loggingConfiguration: details?.loggingConfiguration,
              tracingConfiguration: details?.tracingConfiguration,
              definition: details?.definition,
            },
            security: {
              hasRole: !!details?.roleArn,
              loggingEnabled:
                !!details?.loggingConfiguration?.destinations?.length,
              tracingEnabled: details?.tracingConfiguration?.enabled || false,
            },
            cost: {
              estimated: this.estimateStepFunctionsCost(stateMachine.type),
              currency: "USD",
              billingPeriod: "monthly",
              lastUpdated: new Date(),
            },
          });

          // Add IAM role relationship
          if (details?.roleArn) {
            this.addRelationship(
              resource,
              "references",
              details.roleArn,
              "iam-role",
            );
          }

          // Parse definition to find Lambda function references
          if (details?.definition) {
            try {
              const definition = JSON.parse(details.definition);
              this.extractResourceReferences(resource, definition);
            } catch (error: any) {
              this.logger.debug(
                `Failed to parse state machine definition for ${stateMachine.name}: ${error.message}`,
              );
            }
          }

          this.resources.push(resource);
        }

        nextToken = response.nextToken;
      } while (nextToken);
    } catch (error: any) {
      this.logger.error("Failed to collect Step Functions:", error);
      this.errors.push(`Step Functions: ${error.message}`);
    }
  }

  private async getStateMachineDetails(
    arn: string,
  ): Promise<DescribeStateMachineCommandOutput | null> {
    try {
      const response = await this.client.send(
        new DescribeStateMachineCommand({
          stateMachineArn: arn,
        }),
      );
      return response;
    } catch (error: any) {
      this.logger.debug(`Failed to get details for ${arn}: ${error.message}`);
      return null;
    }
  }

  private async getStateMachineTags(arn: string) {
    try {
      const response = await this.client.send(
        new ListTagsForResourceCommand({
          resourceArn: arn,
        }),
      );
      return response.tags || [];
    } catch (error: any) {
      this.logger.debug(`Failed to get tags for ${arn}: ${error.message}`);
      return [];
    }
  }

  private extractResourceReferences(resource: any, definition: any) {
    // Recursively search for AWS service integrations in the state machine definition
    const findReferences = (obj: any): void => {
      if (!obj || typeof obj !== "object") return;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          findReferences(item);
        }
        return;
      }

      // Look for Lambda function references
      if (obj.Resource && typeof obj.Resource === "string") {
        if (
          obj.Resource.includes("lambda:invoke") ||
          obj.Resource.includes(":function:")
        ) {
          // Extract Lambda function ARN
          const functionArn = obj.Resource.includes(":function:")
            ? obj.Resource
            : obj.Resource.replace("arn:aws:states:::lambda:invoke", "");

          if (functionArn.includes(":function:")) {
            this.addRelationship(
              resource,
              "references",
              functionArn,
              "lambda-function",
            );
          }
        }

        // Look for other AWS service integrations
        if (obj.Resource.includes("sns:publish")) {
          // SNS topic reference - we'd need to extract the actual topic ARN
        }

        if (obj.Resource.includes("sqs:sendMessage")) {
          // SQS queue reference - we'd need to extract the actual queue ARN
        }
      }

      // Recursively search nested objects
      for (const value of Object.values(obj)) {
        findReferences(value);
      }
    };

    findReferences(definition);
  }

  private estimateStepFunctionsCost(type?: string): number {
    // Step Functions pricing:
    // Standard Workflows: $0.025 per 1,000 state transitions
    // Express Workflows: $1.00 per 1 million requests + $0.00001667 per GB-second

    if (type === "EXPRESS") {
      // Express workflows - assume 100k requests per month
      const requestCost = (100000 / 1000000) * 1.0; // $0.10
      const durationCost = 0.5; // Estimate for memory and duration
      return requestCost + durationCost;
    }

    // Standard workflows - assume 1000 state transitions per month
    const standardCost = (1000 / 1000) * 0.025; // $0.025
    return Math.max(standardCost, 0.01); // Minimum $0.01
  }
}
