import "server-only";

import { LambdaClient } from "@aws-sdk/client-lambda";

let lambdaClient: LambdaClient | undefined;
let configuredRegion: string | undefined;

export function getLambdaClient(region: string): LambdaClient {
  if (lambdaClient === undefined || configuredRegion !== region) {
    lambdaClient = new LambdaClient({
      maxAttempts: 2,
      region,
    });
    configuredRegion = region;
  }

  return lambdaClient;
}
