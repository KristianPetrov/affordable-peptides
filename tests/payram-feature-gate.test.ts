import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePayRamFeatureGate } from "../lib/payram/feature-gate";

function liveEnvironment(
  overrides: Record<string, string | undefined> = {}
) {
  return {
    PAYRAM_CARD_CRYPTO_ENABLED: "true",
    PAYRAM_BASE_URL: "https://pay.example.com",
    PAYRAM_API_KEY: "server-only-key",
    ...overrides,
  };
}

test("enables checkout with the switch, an HTTPS server, and an API key", () => {
  const gate = evaluatePayRamFeatureGate(liveEnvironment());
  assert.equal(gate.enabled, true);
  assert.equal(gate.adminOnly, false);
});

test("fails closed when the switch, API key, or HTTPS server is missing", () => {
  const cases: Array<[Record<string, string | undefined>, string]> = [
    [{ PAYRAM_CARD_CRYPTO_ENABLED: "false" }, "PAYRAM_CARD_CRYPTO_ENABLED"],
    [{ PAYRAM_API_KEY: " " }, "PAYRAM_API_KEY"],
    [{ PAYRAM_BASE_URL: "http://pay.example.com" }, "PAYRAM_BASE_URL_HTTPS"],
    [
      { PAYRAM_BASE_URL: "https://pay.example.com/api" },
      "PAYRAM_BASE_URL_HTTPS",
    ],
  ];
  for (const [overrides, requirement] of cases) {
    const gate = evaluatePayRamFeatureGate(liveEnvironment(overrides));
    assert.equal(gate.enabled, false, requirement);
    assert.ok(gate.missingRequirements.includes(requirement), requirement);
  }
});

test("rejects a non-native USDC contract and a malformed treasury address", () => {
  const wrongToken = evaluatePayRamFeatureGate(
    liveEnvironment({ PAYRAM_BASE_USDC_ADDRESS: `0x${"3".repeat(40)}` })
  );
  assert.ok(
    wrongToken.missingRequirements.includes("PAYRAM_NATIVE_BASE_USDC_ADDRESS")
  );

  const badTreasury = evaluatePayRamFeatureGate(
    liveEnvironment({ PAYRAM_TREASURY_WALLET_ADDRESS: "not-an-address" })
  );
  assert.ok(
    badTreasury.missingRequirements.includes("PAYRAM_TREASURY_WALLET_ADDRESS")
  );
});

test("admin-only mode works in any environment, including the old flag name", () => {
  for (const key of ["PAYRAM_ADMIN_ONLY", "PAYRAM_MAINNET_TEST_MODE"]) {
    const gate = evaluatePayRamFeatureGate(
      liveEnvironment({ [key]: "true", VERCEL_ENV: "production" })
    );
    assert.equal(gate.enabled, true, key);
    assert.equal(gate.adminOnly, true, key);
  }
});
