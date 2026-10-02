import "server-only";

import {
  BASE_NATIVE_USDC_ADDRESS,
  isBaseAddress,
  normalizeAddress,
} from "./constants";
import {
  canUsePayRamCheckout as canUseInEnvironment,
  evaluatePayRamFeatureGate,
  type PayRamCheckoutUser,
  isPayRamAdminOnly as isAdminOnlyEnvironment,
  parsePayRamHttpsUrl,
} from "./feature-gate";

export type PayRamConfig = {
  apiKey: string;
  baseUrl: string;
  checkoutOrigin: string;
  tokenAddress: string;
  treasuryWalletAddress: string;
  requestTimeoutMs: number;
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isPayRamCheckoutEnabled(): boolean {
  return evaluatePayRamFeatureGate(process.env).enabled;
}

/** True when this user may start or view PayRam checkout (see PAYRAM_ADMIN_ONLY). */
export function canUsePayRamCheckout(user: PayRamCheckoutUser): boolean {
  return canUseInEnvironment(process.env, user);
}

/** When true, only admins and PAYRAM_TESTER_EMAILS can start PayRam checkout. */
export function isPayRamAdminOnly(): boolean {
  return isAdminOnlyEnvironment(process.env);
}

export function getPayRamConfig(): PayRamConfig {
  const gate = evaluatePayRamFeatureGate(process.env);
  if (!gate.enabled) {
    throw new Error(
      `PayRam checkout is disabled; unmet requirements: ${gate.missingRequirements.join(
        ", "
      )}`
    );
  }

  return getPayRamOperationalConfig();
}

/**
 * Existing attempts must continue reconciling after checkout is rolled back.
 * This validates only the credentials and immutable settlement configuration,
 * not the feature-launch gates used for creating new attempts.
 */
export function getPayRamOperationalConfig(): PayRamConfig {
  const baseUrl = parsePayRamHttpsUrl(process.env.PAYRAM_BASE_URL);
  const checkoutOrigin = parsePayRamHttpsUrl(
    process.env.PAYRAM_CHECKOUT_ORIGIN?.trim() || process.env.PAYRAM_BASE_URL
  );
  const apiKey = process.env.PAYRAM_API_KEY?.trim();
  const treasuryWalletAddress =
    process.env.PAYRAM_TREASURY_WALLET_ADDRESS?.trim() ?? "";
  const tokenAddress =
    process.env.PAYRAM_BASE_USDC_ADDRESS?.trim() ||
    BASE_NATIVE_USDC_ADDRESS;

  if (
    !baseUrl ||
    !checkoutOrigin ||
    !apiKey ||
    !isBaseAddress(tokenAddress) ||
    normalizeAddress(tokenAddress) !==
      normalizeAddress(BASE_NATIVE_USDC_ADDRESS)
  ) {
    throw new Error(
      "PayRam operational credentials are not configured for reconciliation."
    );
  }

  return {
    apiKey,
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    checkoutOrigin: checkoutOrigin.origin,
    tokenAddress,
    treasuryWalletAddress,
    requestTimeoutMs: parsePositiveInteger(
      process.env.PAYRAM_REQUEST_TIMEOUT_MS,
      10_000
    ),
  };
}
