import { env } from "@/env";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { fromEnv } from "@aws-sdk/credential-provider-env";
import { fromIni } from "@aws-sdk/credential-provider-ini";

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface AWSClientConfig {
  region: string;
  credentials?: any;
}

/**
 * Get AWS client configuration based on environment variables and credentials
 */
export async function getAWSClientConfig(): Promise<AWSClientConfig> {
  const config: AWSClientConfig = {
    region: env.AWS_REGION,
  };

  // Priority order for credential providers:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. AWS profile from credentials file
  // 3. AWS role assumption
  // 4. Default credential chain (EC2 instance profile, etc.)

  try {
    // Option 1: Direct environment variables
    if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      console.log("Using AWS credentials from environment variables");
      config.credentials = {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Option 2: AWS Profile from credentials file
    else if (env.AWS_PROFILE) {
      console.log(`Using AWS profile: ${env.AWS_PROFILE}`);
      const credentialsOptions: any = {
        profile: env.AWS_PROFILE,
      };

      // Use custom credentials file if specified
      if (env.AWS_SHARED_CREDENTIALS_FILE) {
        credentialsOptions.filepath = env.AWS_SHARED_CREDENTIALS_FILE;
      }
      if (env.AWS_CONFIG_FILE) {
        credentialsOptions.configFilepath = env.AWS_CONFIG_FILE;
      }

      config.credentials = fromIni(credentialsOptions);
    }
    // Option 3: Role assumption
    else if (env.AWS_ROLE_ARN) {
      console.log(`Assuming AWS role: ${env.AWS_ROLE_ARN}`);
      const stsClient = new STSClient({
        region: env.AWS_REGION,
        credentials: fromEnv(), // Use environment credentials to assume role
      });

      const assumeRoleCommand = new AssumeRoleCommand({
        RoleArn: env.AWS_ROLE_ARN,
        RoleSessionName: env.AWS_ROLE_SESSION_NAME,
        DurationSeconds: 3600, // 1 hour
      });

      const assumeRoleResponse = await stsClient.send(assumeRoleCommand);

      if (assumeRoleResponse.Credentials) {
        config.credentials = {
          accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
          secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
          sessionToken: assumeRoleResponse.Credentials.SessionToken!,
        };
      }
    }
    // Option 4: Default credential chain (fallback)
    else {
      console.log("Using default AWS credential chain");
      // Don't set credentials - let AWS SDK use default chain
    }
  } catch (error) {
    console.error("Failed to configure AWS credentials:", error);
    throw new Error("Unable to configure AWS credentials");
  }

  return config;
}

/**
 * Get AWS account ID using STS
 */
export async function getAWSAccountId(
  config: AWSClientConfig,
): Promise<string> {
  try {
    const { GetCallerIdentityCommand } = await import("@aws-sdk/client-sts");
    const stsClient = new STSClient(config);
    const response = await stsClient.send(new GetCallerIdentityCommand({}));
    return response.Account || "unknown";
  } catch (error) {
    console.error("Failed to get AWS account ID:", error);
    return "unknown";
  }
}

/**
 * Validate AWS credentials by making a test call
 */
export async function validateAWSCredentials(
  config: AWSClientConfig,
): Promise<boolean> {
  try {
    const accountId = await getAWSAccountId(config);
    return accountId !== "unknown";
  } catch (error) {
    console.error("AWS credentials validation failed:", error);
    return false;
  }
}

/**
 * Get collection configuration from environment
 */
export function getCollectionConfig() {
  return {
    timeout: env.COLLECTION_TIMEOUT,
    retryAttempts: env.COLLECTION_RETRY_ATTEMPTS,
    retryDelay: env.COLLECTION_RETRY_DELAY,
  };
}
