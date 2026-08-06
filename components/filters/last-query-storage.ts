import { z } from "zod";
import type { CagedQueryResult } from "@/domain/caged/schemas";

const storageKey = "dataempregos:last-successful-query";

const monthlyMetricsSchema = z.object({
  admissions: z.number(),
  avgSalary: z.number(),
  dismissals: z.number(),
  netBalance: z.number(),
  salaryCount: z.number(),
  salarySum: z.number(),
  totalTurnover: z.number(),
});

const queryResultSchema = z.object({
  catalogVersion: z.string(),
  dataset: z.string(),
  location: z.object({
    code: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  months: z.record(z.string(), monthlyMetricsSchema),
  profession: z.object({
    code: z.string(),
    title: z.string(),
  }),
  query: z.object({
    from: z.string(),
    locationCode: z.string().optional(),
    locationType: z.string(),
    professionCode: z.string(),
    to: z.string(),
  }),
});

const lastQuerySchema = z.object({
  cityCode: z.string().optional(),
  cityInput: z.string(),
  from: z.string(),
  locationMode: z.enum(["COUNTRY", "STATE", "CITY"]),
  professionCode: z.string().optional(),
  professionInput: z.string(),
  result: queryResultSchema,
  stateCode: z.string().optional(),
  stateInput: z.string(),
  to: z.string(),
  version: z.literal(1),
});

export type LastQuery = Omit<z.infer<typeof lastQuerySchema>, "result"> & {
  result: CagedQueryResult;
};

export function loadLastQuery(): LastQuery | undefined {
  try {
    const storedQuery = window.sessionStorage.getItem(storageKey);

    if (storedQuery === null) {
      return undefined;
    }

    const parsedQuery = lastQuerySchema.safeParse(JSON.parse(storedQuery));

    if (parsedQuery.success) {
      return parsedQuery.data;
    }

    window.sessionStorage.removeItem(storageKey);
  } catch {
    return undefined;
  }

  return undefined;
}

export function saveLastQuery(query: LastQuery): void {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(query));
  } catch {
    // Storage can be unavailable or full; the search result remains usable in memory.
  }
}
