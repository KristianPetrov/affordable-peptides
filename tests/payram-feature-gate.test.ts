import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePayRamFeatureGate } from "../lib/payram/feature-gate";

const MASTER = `0x${"1".repeat(40)}`;
const TREASURY = `0x${"2".repeat(40)}`;

function qualifiedEnvironment(
  overrides: Record<string, string | undefined> = {}
) {
  return {
    PAYRAM_CARD_CRYPTO_ENABLED: "true",
    PAYRAM_PROVIDER_QUALIFIED: "true",
    PAYRAM_FEE_CAP_ENFORCED: "true",
    PAYRAM_MAINNET_VERIFIED: "true",
    PAYRAM_BASE_URL: "https://pay.example.com",
    PAYRAM_CHECKOUT_ORIGIN: "https://pay.example.com",
    PAYRAM_API_KEY: "server-only-key",
    PAYRAM_MAX_FEE_BPS: "800",
    PAYRAM_MASTER_WALLET_ADDRESS: MASTER,
    PAYRAM_TREASURY_WALLET_ADDRESS: TREASURY,
    ...overrides,
  };
}

test("enables checkout only when every launch gate passes", () => {
  assert.equal(
    evaluatePayRamFeatureGate(qualifiedEnvironment()).enabled,
    true
  );
});

test("fails closed when qualification, fee enforcement, or mainnet verification is missing", () => {
  for (const key of [
    "PAYRAM_PROVIDER_QUALIFIED",
    "PAYRAM_FEE_CAP_ENFORCED",
    "PAYRAM_MAINNET_VERIFIED",
  ]) {
    const gate = evaluatePayRamFeatureGate(
      qualifiedEnvironment({ [key]: "false" })
    );
    assert.equal(gate.enabled, false, key);
    assert.ok(gate.missingRequirements.includes(key), key);
  }
});

test("rejects an over-cap fee policy, HTTP, and wallet reuse", () => {
  const overCap = evaluatePayRamFeatureGate(
    qualifiedEnvironment({ PAYRAM_MAX_FEE_BPS: "801" })
  );
  assert.equal(overCap.enabled, false);

  const insecure = evaluatePayRamFeatureGate(
    qualifiedEnvironment({ PAYRAM_BASE_URL: "http://pay.example.com" })
  );
  assert.equal(insecure.enabled, false);

  const sameWallet = evaluatePayRamFeatureGate(
    qualifiedEnvironment({ PAYRAM_TREASURY_WALLET_ADDRESS: MASTER })
  );
  assert.equal(sameWallet.enabled, false);
  assert.ok(
    sameWallet.missingRequirements.includes(
      "PAYRAM_SEPARATE_MASTER_AND_TREASURY_WALLETS"
    )
  );

  const wrongToken = evaluatePayRamFeatureGate(
    qualifiedEnvironment({
      PAYRAM_BASE_USDC_ADDRESS: `0x${"3".repeat(40)}`,
    })
  );
  assert.equal(wrongToken.enabled, false);
  assert.ok(
    wrongToken.missingRequirements.includes(
      "PAYRAM_NATIVE_BASE_USDC_ADDRESS"
    )
  );
});
