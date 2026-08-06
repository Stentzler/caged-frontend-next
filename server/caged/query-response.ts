import "server-only";

import { ZodError } from "zod";
import {
  normalizeCagedResponse,
  type CagedQueryResult,
} from "@/domain/caged/schemas";
import { CagedError } from "@/domain/caged/errors";

export function parseQueryResponse(
  statusCode: number,
  body: string,
): CagedQueryResult {
  if (statusCode === 400) {
    throw new CagedError("invalid_query");
  }

  if (statusCode === 503) {
    throw new CagedError("unavailable");
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new CagedError("upstream_error");
  }

  try {
    return normalizeCagedResponse(JSON.parse(body));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new CagedError("upstream_contract_error");
    }

    throw error;
  }
}
