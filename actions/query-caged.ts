"use server";

import {
  cagedQueryInputSchema,
  type CagedQueryResult,
} from "@/domain/caged/schemas";
import { CagedError, CagedInputError, type CagedErrorCode } from "@/domain/caged/errors";
import { executeCagedQuery } from "@/server/caged/query-service";

export type QueryCagedActionResult =
  | { ok: true; data: CagedQueryResult }
  | { ok: false; error: CagedErrorCode };

export async function queryCaged(input: unknown): Promise<QueryCagedActionResult> {
  try {
    const parsedInput = cagedQueryInputSchema.safeParse(input);

    if (!parsedInput.success) {
      throw new CagedInputError();
    }

    return {
      ok: true,
      data: await executeCagedQuery(parsedInput.data),
    };
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
