import "server-only";

import type { CagedQueryInput, CagedQueryResult } from "@/domain/caged/schemas";
import { getServerConfiguration } from "@/config/env";
import { queryCagedWithIam } from "@/server/aws/query-lambda-adapter";
import { queryCagedWithFunctionUrl } from "@/server/http/query-function-url-adapter";

export async function executeCagedQuery(
  input: CagedQueryInput,
): Promise<CagedQueryResult> {
  const configuration = getServerConfiguration();

  if (configuration.queryTransport === "function_url") {
    return queryCagedWithFunctionUrl(input, configuration.queryLambdaUrl);
  }

  return queryCagedWithIam(input, configuration);
}
