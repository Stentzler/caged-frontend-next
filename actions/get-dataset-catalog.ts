"use server";

import { loadDatasetCatalog } from "@/server/caged/dataset-catalog-service";

export async function getDatasetCatalogAction() {
  return loadDatasetCatalog();
}
