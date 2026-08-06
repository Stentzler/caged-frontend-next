export type CagedErrorCode =
  | "configuration_error"
  | "invalid_input"
  | "invalid_query"
  | "rate_limited"
  | "unavailable"
  | "upstream_contract_error"
  | "upstream_error";

export class CagedError extends Error {
  constructor(public readonly code: Exclude<CagedErrorCode, "invalid_input">) {
    super(code);
    this.name = "CagedError";
  }
}

export class CagedInputError extends Error {
  constructor() {
    super("invalid_input");
    this.name = "CagedInputError";
  }
}
