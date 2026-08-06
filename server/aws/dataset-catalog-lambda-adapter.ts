import "server-only";

import { InvokeCommand } from "@aws-sdk/client-lambda";
import { ZodError, z } from "zod";

import type { DatasetCatalog } from "@/domain/caged/dataset-catalog";
import { CagedError } from "@/domain/caged/errors";
import { parseDatasetCatalogResponse } from "@/server/caged/dataset-catalog-response";
import { getLambdaClient } from "./lambda-client";

const requestTimeoutMs = 10_000;
const datasetCatalogOperation = { operation: "getDatasetCatalog" };

const datasetCatalogEnvelopeSchema = z.object({
  body: z.unknown(),
  statusCode: z.number().int(),
});

type IamQueryConfiguration = {
  awsRegion: string;
  queryLambdaFunctionName: string;
};

export async function getDatasetCatalogWithIam(
  configuration: IamQueryConfiguration,
): Promise<DatasetCatalog> {
  const command = new InvokeCommand({
    FunctionName: configuration.queryLambdaFunctionName,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(datasetCatalogOperation)),
  });

  let response;

  try {
    response = await getLambdaClient(configuration.awsRegion).send(command, {
      abortSignal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch {
    throw new CagedError("upstream_error");
  }

  if (response.FunctionError !== undefined || response.Payload === undefined) {
    throw new CagedError("upstream_error");
  }

  const payload = new TextDecoder("utf-8").decode(response.Payload);

  if (payload.length === 0) {
    throw new CagedError("upstream_contract_error");
  }

  try {
    const envelope = datasetCatalogEnvelopeSchema.parse(JSON.parse(payload));

    return parseDatasetCatalogResponse(envelope.statusCode, envelope.body);
  } catch (error) {
    if (error instanceof CagedError) {
      throw error;
    }

    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new CagedError("upstream_contract_error");
    }

    throw new CagedError("upstream_error");
  }
}
