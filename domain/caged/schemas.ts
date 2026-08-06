import { z } from "zod";

const monthSchema = z.string().regex(/^\d{4}(0[1-9]|1[0-2])$/);
const stateCodeSchema = z.string().regex(/^\d{2}$/);
const cityCodeSchema = z.string().regex(/^\d{6}$/);
const occupationalFamilyCodeSchema = z.string().regex(/^\d{4}$/);

export const cagedQueryInputSchema = z
  .object({
    locale: z.enum(["pt-BR", "en"]),
    locationType: z.enum(["COUNTRY", "STATE", "CITY"]),
    locationCode: z.string().optional(),
    professionCode: occupationalFamilyCodeSchema.optional(),
    from: monthSchema.optional(),
    to: monthSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.locationType === "COUNTRY" && value.locationCode !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Country queries cannot include a location code.",
        path: ["locationCode"],
      });
    }

    if (value.locationType === "STATE" && !stateCodeSchema.safeParse(value.locationCode).success) {
      context.addIssue({
        code: "custom",
        message: "State queries require a two-digit location code.",
        path: ["locationCode"],
      });
    }

    if (value.locationType === "CITY" && !cityCodeSchema.safeParse(value.locationCode).success) {
      context.addIssue({
        code: "custom",
        message: "City queries require a six-digit location code.",
        path: ["locationCode"],
      });
    }

    if ((value.from === undefined) !== (value.to === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Start and end months must be supplied together.",
        path: ["from"],
      });
    }
  });

export type CagedQueryInput = z.infer<typeof cagedQueryInputSchema>;

export const queryLambdaEventSchema = z.object({
  queryStringParameters: z.record(z.string(), z.string()),
});

export type QueryLambdaEvent = z.infer<typeof queryLambdaEventSchema>;

const rawMonthSchema = z.object({
  admissions: z.number(),
  dismissals: z.number(),
  net_balance: z.number(),
  total_turnover: z.number(),
  avg_salary: z.number(),
  salary_sum: z.number(),
  salary_count: z.number(),
});

export const rawCagedResponseSchema = z.object({
  dataset: z.string(),
  catalog_version: z.string(),
  query: z.object({
    location_type: z.string(),
    location_code: z.string().nullable(),
    profession_code: z.string(),
    from: monthSchema,
    to: monthSchema,
  }),
  location: z.object({
    type: z.string(),
    code: z.string(),
    name: z.string(),
  }),
  profession: z.object({
    code: z.string(),
    title: z.string(),
  }),
  months: z.record(monthSchema, rawMonthSchema),
});

const lambdaEnvelopeSchema = z.object({
  statusCode: z.number().int(),
  headers: z.unknown().optional(),
  body: z.string(),
});

export type LambdaEnvelope = z.infer<typeof lambdaEnvelopeSchema>;

export type CagedQueryResult = {
  dataset: string;
  catalogVersion: string;
  query: {
    locationType: string;
    locationCode?: string;
    professionCode: string;
    from: string;
    to: string;
  };
  location: {
    type: string;
    code: string;
    name: string;
  };
  profession: {
    code: string;
    title: string;
  };
  months: Record<
    string,
    {
      admissions: number;
      dismissals: number;
      netBalance: number;
      totalTurnover: number;
      avgSalary: number;
      salarySum: number;
      salaryCount: number;
    }
  >;
};

export function buildQueryLambdaEvent(input: CagedQueryInput): QueryLambdaEvent {
  const queryStringParameters: Record<string, string> = {
    locationType: input.locationType,
  };

  if (input.locationCode !== undefined) {
    queryStringParameters.locationCode = input.locationCode;
  }

  if (input.professionCode !== undefined) {
    queryStringParameters.professionCode = input.professionCode;
  }

  if (input.from !== undefined && input.to !== undefined) {
    queryStringParameters.from = input.from;
    queryStringParameters.to = input.to;
  }

  return { queryStringParameters };
}

export function parseLambdaEnvelope(value: unknown): LambdaEnvelope {
  return lambdaEnvelopeSchema.parse(value);
}

export function normalizeCagedResponse(value: unknown): CagedQueryResult {
  const response = rawCagedResponseSchema.parse(value);

  return {
    dataset: response.dataset,
    catalogVersion: response.catalog_version,
    query: {
      locationType: response.query.location_type,
      locationCode: response.query.location_code ?? undefined,
      professionCode: response.query.profession_code,
      from: response.query.from,
      to: response.query.to,
    },
    location: response.location,
    profession: response.profession,
    months: Object.fromEntries(
      Object.entries(response.months).map(([month, metrics]) => [
        month,
        {
          admissions: metrics.admissions,
          dismissals: metrics.dismissals,
          netBalance: metrics.net_balance,
          totalTurnover: metrics.total_turnover,
          avgSalary: metrics.avg_salary,
          salarySum: metrics.salary_sum,
          salaryCount: metrics.salary_count,
        },
      ]),
    ),
  };
}
