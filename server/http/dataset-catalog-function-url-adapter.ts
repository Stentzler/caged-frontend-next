import "server-only";

import type { DatasetCatalog } from "@/domain/caged/dataset-catalog";
import { CagedError } from "@/domain/caged/errors";
import { parseDatasetCatalogResponse } from "@/server/caged/dataset-catalog-response";

const requestTimeoutMs = 10_000;
const datasetCatalogOperation = { operation: "getDatasetCatalog" };

export async function getDatasetCatalogWithFunctionUrl(
  functionUrl: string,
): Promise<DatasetCatalog> {
  const url = new URL(functionUrl);
  url.searchParams.set("operation", datasetCatalogOperation.operation);

  let response: Response;

  try {
    response = await fetch(url, {
      body: JSON.stringify({}),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new CagedError("upstream_error");
  }

  return parseDatasetCatalogResponse(response.status, await response.text());
}
