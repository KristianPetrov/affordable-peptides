export const PAYRAM_PROVIDER = "payram";
export const PAYRAM_SETTLEMENT_ASSET = "USDC";
export const PAYRAM_SETTLEMENT_NETWORK = "BASE";
export const PAYRAM_MAX_COMBINED_FEE_BPS = 800;
export const BASE_NATIVE_USDC_ADDRESS =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const PAYRAM_ACTIVE_ATTEMPT_STATUSES = [
  "CREATING",
  "OPEN",
  "CONFIRMING",
  "PARTIALLY_FILLED",
  "RECONCILIATION_REQUIRED",
] as const;

export type PayRamProviderStatus =
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "OVER_FILLED"
  | "CANCELLED";

export type PayRamAttemptStatus =
  | "CREATING"
  | "OPEN"
  | "CONFIRMING"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "OVER_FILLED"
  | "CANCELLED"
  | "FAILED"
  | "RECONCILIATION_REQUIRED"
  | "REVIEW_REQUIRED";

export function isBaseAddress(value: string | null | undefined): value is string {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

export function isBaseTransactionHash(
  value: string | null | undefined
): boolean {
  return Boolean(value && /^0x[a-fA-F0-9]{64}$/.test(value));
}

export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}
