import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { getAWSClientConfig } from "@/server/config/aws";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";

export const accountRouter = createTRPCRouter({
	// Get AWS account information
	info: publicProcedure.query(async () => {
		try {
			const config = await getAWSClientConfig();
			const stsClient = new STSClient(config);

			const command = new GetCallerIdentityCommand({});
			const response = await stsClient.send(command);

			return {
				accountId: response.Account || "Unknown",
				region: config.region || "Unknown",
				profile: process.env.AWS_PROFILE || "default",
				userId: response.UserId || "Unknown",
				arn: response.Arn || "Unknown",
			};
		} catch (error) {
			console.error("Failed to get AWS account info:", error);
			return {
				accountId: "Unknown",
				region: process.env.AWS_DEFAULT_REGION || "us-east-1",
				profile: process.env.AWS_PROFILE || "default",
				userId: "Unknown",
				arn: "Unknown",
			};
		}
	}),
});
