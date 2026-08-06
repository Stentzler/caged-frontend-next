import "server-only";

import { ZodError } from "zod";

import { normalizeDatasetCatalog, type DatasetCatalog } from "@/domain/caged/dataset-catalog";
import { CagedError } from "@/domain/caged/errors";

function parseCatalogBody(body: unknown): DatasetCatalog {
  const parsedBody = typeof body === "string" ? JSON.parse(body) : body;

  return normalizeDatasetCatalog(parsedBody);
}

export function parseDatasetCatalogResponse(
  statusCode: number,
  body: unknown,
): DatasetCatalog {
  if (statusCode === 429) {
    throw new CagedError("rate_limited");
  }

  if (statusCode === 503) {
    throw new CagedError("unavailable");
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new CagedError("upstream_error");
  }

  try {
    return parseCatalogBody(body);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new CagedError("upstream_contract_error");
    }

    throw error;
  }
}
