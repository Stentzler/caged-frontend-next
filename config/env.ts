import "server-only";

import { z } from "zod";
import { CagedError } from "@/domain/caged/errors";

const optionalEnvironmentValueSchema = z.string().trim().min(1).optional();

const environmentSchema = z.object({
  AWS_REGION: optionalEnvironmentValueSchema,
  CAGED_QUERY_LAMBDA_FUNCTION_NAME: optionalEnvironmentValueSchema,
  CAGED_QUERY_LAMBDA_URL: z.url().optional(),
});

type ServerConfiguration =
  | {
      queryTransport: "function_url";
      queryLambdaUrl: string;
    }
  | {
      queryTransport: "iam";
      awsRegion: string;
      queryLambdaFunctionName: string;
    };

export function getServerConfiguration(): ServerConfiguration {
  const parsedEnvironment = environmentSchema.safeParse(process.env);

  if (!parsedEnvironment.success) {
    throw new CagedError("configuration_error");
  }

  const environment = parsedEnvironment.data;

  if (process.env.NODE_ENV === "production") {
    if (environment.CAGED_QUERY_LAMBDA_URL !== undefined) {
      throw new CagedError("configuration_error");
    }

    if (
      environment.AWS_REGION === undefined ||
      environment.CAGED_QUERY_LAMBDA_FUNCTION_NAME === undefined
    ) {
      throw new CagedError("configuration_error");
    }

    return {
      queryTransport: "iam",
      awsRegion: environment.AWS_REGION,
      queryLambdaFunctionName: environment.CAGED_QUERY_LAMBDA_FUNCTION_NAME,
    };
  }

  if (environment.CAGED_QUERY_LAMBDA_URL === undefined) {
    throw new CagedError("configuration_error");
  }

  return {
    queryTransport: "function_url",
    queryLambdaUrl: environment.CAGED_QUERY_LAMBDA_URL,
  };
}
