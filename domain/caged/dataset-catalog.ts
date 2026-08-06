import { z } from "zod";

import type { CagedQueryInput } from "./schemas";

const monthSchema = z.string().regex(/^\d{4}(0[1-9]|1[0-2])$/);

const rawDatasetCatalogSchema = z
  .object({
    available_months: z.array(monthSchema).min(1),
    latest_available_month: monthSchema,
    max_date_range: z.number().int().positive(),
    updated_at: z.string().optional(),
  })
  .superRefine((catalog, context) => {
    if (!catalog.available_months.includes(catalog.latest_available_month)) {
      context.addIssue({
        code: "custom",
        message: "The latest available month must be in the available months list.",
        path: ["latest_available_month"],
      });
    }

    if (new Set(catalog.available_months).size !== catalog.available_months.length) {
      context.addIssue({
        code: "custom",
        message: "Available months must be unique.",
        path: ["available_months"],
      });
    }
  });

export type DatasetCatalog = {
  availableMonths: readonly string[];
  latestAvailableMonth: string;
  maxDateRange: number;
  updatedAt?: string;
};

function toMonthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(4, 6)) - 1;
}

function getMonthsInRange(from: string, to: string): string[] {
  const months: string[] = [];
  const fromIndex = toMonthIndex(from);
  const toIndex = toMonthIndex(to);

  for (let index = fromIndex; index <= toIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    months.push(`${year}${String(month).padStart(2, "0")}`);
  }

  return months;
}

export function normalizeDatasetCatalog(value: unknown): DatasetCatalog {
  const catalog = rawDatasetCatalogSchema.parse(value);

  return {
    availableMonths: [...catalog.available_months].sort((firstMonth, secondMonth) =>
      firstMonth.localeCompare(secondMonth),
    ),
    latestAvailableMonth: catalog.latest_available_month,
    maxDateRange: catalog.max_date_range,
    updatedAt: catalog.updated_at,
  };
}

export function hasValidCatalogDateRange(
  from: string,
  to: string,
  catalog: DatasetCatalog,
): boolean {
  if (from > to) {
    return false;
  }

  const selectedMonths = getMonthsInRange(from, to);

  return (
    selectedMonths.length <= catalog.maxDateRange &&
    selectedMonths.every((month) => catalog.availableMonths.includes(month))
  );
}

export function applyCatalogDateDefaults(
  input: CagedQueryInput,
  catalog: DatasetCatalog,
): CagedQueryInput | undefined {
  const from = input.from ?? catalog.latestAvailableMonth;
  const to = input.to ?? catalog.latestAvailableMonth;

  if (!hasValidCatalogDateRange(from, to, catalog)) {
    return undefined;
  }

  return { ...input, from, to };
}
