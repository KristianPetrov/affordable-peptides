import "server-only";

import {
  BASE_NATIVE_USDC_ADDRESS,
  PAYRAM_MAX_COMBINED_FEE_BPS,
  isBaseAddress,
  normalizeAddress,
} from "./constants";
import { evaluatePayRamFeatureGate } from "./feature-gate";

export type PayRamConfig = {
  apiKey: string;
  baseUrl: string;
  checkoutOrigin: string;
  tokenAddress: string;
  masterWalletAddress: string;
  treasuryWalletAddress: string;
  maxFeeBps: number;
  requestTimeoutMs: number;
};

function parsePositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseHttpsUrl(value: string | undefined): URL | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      (parsed.pathname === "/" || parsed.pathname === "") &&
      !parsed.search &&
      !parsed.hash
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function isPayRamCheckoutEnabled(): boolean {
  return evaluatePayRamFeatureGate(process.env).enabled;
}

export function isPayRamMainnetTestMode(): boolean {
  return process.env.PAYRAM_MAINNET_TEST_MODE?.trim().toLowerCase() === "true";
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
  const baseUrl = parseHttpsUrl(process.env.PAYRAM_BASE_URL);
  const checkoutOrigin = parseHttpsUrl(
    process.env.PAYRAM_CHECKOUT_ORIGIN ?? process.env.PAYRAM_BASE_URL
  );
  const apiKey = process.env.PAYRAM_API_KEY?.trim();
  const maxFeeBps = Number(process.env.PAYRAM_MAX_FEE_BPS);
  const masterWalletAddress =
    process.env.PAYRAM_MASTER_WALLET_ADDRESS?.trim() ?? "";
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
    masterWalletAddress,
    treasuryWalletAddress,
    maxFeeBps: Number.isInteger(maxFeeBps)
      ? maxFeeBps
      : PAYRAM_MAX_COMBINED_FEE_BPS,
    requestTimeoutMs: parsePositiveInteger(
      process.env.PAYRAM_REQUEST_TIMEOUT_MS,
      10_000
    ),
  };
}
