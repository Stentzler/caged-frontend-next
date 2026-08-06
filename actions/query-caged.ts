"use server";

import {
  cagedQueryInputSchema,
  type CagedQueryInput,
  type CagedQueryResult,
} from "@/domain/caged/schemas";
import { applyCatalogDateDefaults } from "@/domain/caged/dataset-catalog";
import { CagedError, CagedInputError, type CagedErrorCode } from "@/domain/caged/errors";
import { getDatasetCatalog } from "@/server/caged/dataset-catalog-service";
import { executeCagedQuery } from "@/server/caged/query-service";
import occupationalFamilies from "@/data/cbo-occupational-families.json";
import geography from "@/data/caged-geography.json";

export type QueryCagedActionResult =
  | { ok: true; data: CagedQueryResult }
  | { ok: false; error: CagedErrorCode };

function hasKnownStaticSelection(input: CagedQueryInput): boolean {
  if (
    input.locationType === "STATE" &&
    !geography.states.some((state) => state.stateCode === input.locationCode)
  ) {
    return false;
  }

  if (
    input.locationType === "CITY" &&
    !geography.states.some((state) =>
      state.cities.some((city) => city.cityCode === input.locationCode),
    )
  ) {
    return false;
  }

  return (
    input.professionCode === undefined ||
    occupationalFamilies.some((family) => family.familyCode === input.professionCode)
  );
}

export async function queryCaged(input: unknown): Promise<QueryCagedActionResult> {
  try {
    const parsedInput = cagedQueryInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new CagedInputError();
    }

    if (!hasKnownStaticSelection(parsedInput.data)) {
      throw new CagedInputError();
    }

    const queryInput = applyCatalogDateDefaults(
      parsedInput.data,
      await getDatasetCatalog(),
    );

    if (queryInput === undefined) {
      throw new CagedError("invalid_query");
    }

    return { ok: true, data: await executeCagedQuery(queryInput) };
  } catch (error) {
    if (error instanceof CagedInputError) {
      return { ok: false, error: "invalid_input" };
    }

    if (error instanceof CagedError) {
      return { ok: false, error: error.code };
    }

    return { ok: false, error: "upstream_error" };
  }
}
