import "server-only";

import { InvokeCommand } from "@aws-sdk/client-lambda";
import { ZodError } from "zod";
import {
  buildQueryLambdaEvent,
  parseLambdaEnvelope,
  type CagedQueryInput,
  type CagedQueryResult,
} from "@/domain/caged/schemas";
import { CagedError } from "@/domain/caged/errors";
import { parseQueryResponse } from "@/server/caged/query-response";
import { getLambdaClient } from "./lambda-client";

const requestTimeoutMs = 10_000;

type IamQueryConfiguration = {
  awsRegion: string;
  queryLambdaFunctionName: string;
};

export async function queryCagedWithIam(
  input: CagedQueryInput,
  configuration: IamQueryConfiguration,
): Promise<CagedQueryResult> {
  const command = new InvokeCommand({
    FunctionName: configuration.queryLambdaFunctionName,
    InvocationType: "RequestResponse",
    Payload: new TextEncoder().encode(JSON.stringify(buildQueryLambdaEvent(input))),
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
    const envelope = parseLambdaEnvelope(JSON.parse(payload));

    return parseQueryResponse(envelope.statusCode, envelope.body);
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
