import "server-only";

import type { CboIntegrationStatus } from "@/domain/occupations/types";
import { getServerConfiguration } from "@/config/env";

export function getCboIntegrationStatus(): CboIntegrationStatus {
  return getServerConfiguration().cboIntegrationStatus;
}
