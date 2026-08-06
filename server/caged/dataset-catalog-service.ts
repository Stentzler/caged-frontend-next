import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { getServerConfiguration, type ServerConfiguration } from "@/config/env";
import type { DatasetCatalog } from "@/domain/caged/dataset-catalog";
import { CagedError, type CagedErrorCode } from "@/domain/caged/errors";
import { getDatasetCatalogWithIam } from "@/server/aws/dataset-catalog-lambda-adapter";
import { getDatasetCatalogWithFunctionUrl } from "@/server/http/dataset-catalog-function-url-adapter";

export type DatasetCatalogLoadResult =
  | { ok: true; data: DatasetCatalog }
  | { ok: false; error: CagedErrorCode };

async function getCachedDatasetCatalog(
  configuration: ServerConfiguration,
): Promise<DatasetCatalog> {
  "use cache";

  cacheLife("days");

  if (configuration.queryTransport === "function_url") {
    return getDatasetCatalogWithFunctionUrl(configuration.queryLambdaUrl);
  }

  return getDatasetCatalogWithIam(configuration);
}

export async function getDatasetCatalog(): Promise<DatasetCatalog> {
  await connection();

  return getCachedDatasetCatalog(getServerConfiguration());
}

export async function loadDatasetCatalog(): Promise<DatasetCatalogLoadResult> {
  try {
    return { ok: true, data: await getDatasetCatalog() };
  } catch (error) {
    if (error instanceof CagedError) {
      return { ok: false, error: error.code };
    }

    return { ok: false, error: "upstream_error" };
  }
}
