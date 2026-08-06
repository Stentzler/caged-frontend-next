import "server-only";

import { ZodError } from "zod";
import {
  buildQueryLambdaEvent,
  normalizeCagedResponse,
  type CagedQueryInput,
  type CagedQueryResult,
} from "@/domain/caged/schemas";
import { CagedError } from "@/domain/caged/errors";
import { parseQueryResponse } from "@/server/caged/query-response";

const requestTimeoutMs = 10_000;

export async function queryCagedWithFunctionUrl(
  input: CagedQueryInput,
  functionUrl: string,
): Promise<CagedQueryResult> {
  const url = new URL(functionUrl);
  const event = buildQueryLambdaEvent(input);

  for (const [key, value] of Object.entries(event.queryStringParameters)) {
    url.searchParams.set(key, value);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new CagedError("upstream_error");
  }

  const body = await response.text();

  if (!response.ok) {
    return parseQueryResponse(response.status, body);
  }

  try {
    return normalizeCagedResponse(JSON.parse(body));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new CagedError("upstream_contract_error");
    }

    throw new CagedError("upstream_error");
  }
}
