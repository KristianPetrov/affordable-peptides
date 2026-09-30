import {
  BASE_NATIVE_USDC_ADDRESS,
  isBaseAddress,
  normalizeAddress,
} from "./constants";

type Environment = Record<string, string | undefined>;

export type PayRamFeatureGate = {
  enabled: boolean;
  adminOnly: boolean;
  missingRequirements: string[];
};

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function parsePayRamHttpsUrl(value: string | undefined): URL | null {
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

/**
 * Admin-only mode shows PayRam checkout to signed-in storefront admins only,
 * so the owner can place real card payments on the live site before customers
 * see the option. PAYRAM_MAINNET_TEST_MODE is the older name for this switch.
 */
export function isPayRamAdminOnly(environment: Environment): boolean {
  return (
    isTrue(environment.PAYRAM_ADMIN_ONLY) ||
    isTrue(environment.PAYRAM_MAINNET_TEST_MODE)
  );
}

export function evaluatePayRamFeatureGate(
  environment: Environment
): PayRamFeatureGate {
  const missingRequirements: string[] = [];
  const baseUrl = parsePayRamHttpsUrl(environment.PAYRAM_BASE_URL);
  const checkoutOrigin = parsePayRamHttpsUrl(
    environment.PAYRAM_CHECKOUT_ORIGIN?.trim() || environment.PAYRAM_BASE_URL
  );
  const treasuryWalletAddress =
    environment.PAYRAM_TREASURY_WALLET_ADDRESS?.trim();
  const tokenAddress =
    environment.PAYRAM_BASE_USDC_ADDRESS?.trim() ||
    BASE_NATIVE_USDC_ADDRESS;

  if (!isTrue(environment.PAYRAM_CARD_CRYPTO_ENABLED)) {
    missingRequirements.push("PAYRAM_CARD_CRYPTO_ENABLED");
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
  // Optional: only used to label SmartSweep records in the admin panel.
  if (treasuryWalletAddress && !isBaseAddress(treasuryWalletAddress)) {
    missingRequirements.push("PAYRAM_TREASURY_WALLET_ADDRESS");
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
    adminOnly: isPayRamAdminOnly(environment),
    missingRequirements,
  };
}
