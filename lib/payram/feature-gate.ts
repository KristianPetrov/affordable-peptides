import {
  BASE_NATIVE_USDC_ADDRESS,
  PAYRAM_MAX_COMBINED_FEE_BPS,
  isBaseAddress,
  normalizeAddress,
} from "./constants";

type Environment = Record<string, string | undefined>;

export type PayRamFeatureGate = {
  enabled: boolean;
  missingRequirements: string[];
  maxFeeBps: number | null;
};

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
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

export function evaluatePayRamFeatureGate(
  environment: Environment
): PayRamFeatureGate {
  const missingRequirements: string[] = [];
  const baseUrl = parseHttpsUrl(environment.PAYRAM_BASE_URL);
  const checkoutOrigin = parseHttpsUrl(
    environment.PAYRAM_CHECKOUT_ORIGIN ?? environment.PAYRAM_BASE_URL
  );
  const maxFeeBps = Number(environment.PAYRAM_MAX_FEE_BPS);
  const masterWalletAddress = environment.PAYRAM_MASTER_WALLET_ADDRESS?.trim();
  const treasuryWalletAddress =
    environment.PAYRAM_TREASURY_WALLET_ADDRESS?.trim();
  const tokenAddress =
    environment.PAYRAM_BASE_USDC_ADDRESS?.trim() ||
    BASE_NATIVE_USDC_ADDRESS;

  if (!isTrue(environment.PAYRAM_CARD_CRYPTO_ENABLED)) {
    missingRequirements.push("PAYRAM_CARD_CRYPTO_ENABLED");
  }
  if (!isTrue(environment.PAYRAM_PROVIDER_QUALIFIED)) {
    missingRequirements.push("PAYRAM_PROVIDER_QUALIFIED");
  }
  if (!isTrue(environment.PAYRAM_FEE_CAP_ENFORCED)) {
    missingRequirements.push("PAYRAM_FEE_CAP_ENFORCED");
  }
  const mainnetTestMode = isTrue(environment.PAYRAM_MAINNET_TEST_MODE);
  // This is a controlled real-mainnet transaction mode, not a payment
  // simulator. Keep it confined to Vercel Preview even if misconfigured.
  if (mainnetTestMode && environment.VERCEL_ENV !== "preview") {
    missingRequirements.push("PAYRAM_MAINNET_TEST_MODE_PREVIEW_ONLY");
  }
  if (
    !isTrue(environment.PAYRAM_MAINNET_VERIFIED) &&
    !mainnetTestMode
  ) {
    missingRequirements.push("PAYRAM_MAINNET_VERIFIED");
  }
  if (!baseUrl) {
    missingRequirements.push("PAYRAM_BASE_URL_HTTPS");
  }
  if (!checkoutOrigin) {
    missingRequirements.push("PAYRAM_CHECKOUT_ORIGIN_HTTPS");
  }
  if (!environment.PAYRAM_API_KEY?.trim()) {
    missingRequirements.push("PAYRAM_API_KEY");
  }
  if (
    !Number.isInteger(maxFeeBps) ||
    maxFeeBps < 0 ||
    maxFeeBps > PAYRAM_MAX_COMBINED_FEE_BPS
  ) {
    missingRequirements.push("PAYRAM_MAX_FEE_BPS_AT_OR_BELOW_800");
  }
  if (!isBaseAddress(masterWalletAddress)) {
    missingRequirements.push("PAYRAM_MASTER_WALLET_ADDRESS");
  }
  if (!isBaseAddress(treasuryWalletAddress)) {
    missingRequirements.push("PAYRAM_TREASURY_WALLET_ADDRESS");
  }
  if (
    isBaseAddress(masterWalletAddress) &&
    isBaseAddress(treasuryWalletAddress) &&
    normalizeAddress(masterWalletAddress) ===
      normalizeAddress(treasuryWalletAddress)
  ) {
    missingRequirements.push("PAYRAM_SEPARATE_MASTER_AND_TREASURY_WALLETS");
  }
  if (
    !isBaseAddress(tokenAddress) ||
    normalizeAddress(tokenAddress) !==
      normalizeAddress(BASE_NATIVE_USDC_ADDRESS)
  ) {
    missingRequirements.push("PAYRAM_NATIVE_BASE_USDC_ADDRESS");
  }

  return {
    enabled: missingRequirements.length === 0,
    missingRequirements,
    maxFeeBps: Number.isInteger(maxFeeBps) ? maxFeeBps : null,
  };
}
