import assert from "node:assert/strict";
import test from "node:test";

import {
  hashGuestAccessToken,
  hashRawBody,
  verifyGuestAccessToken,
  verifyPayRamApiKey,
} from "../lib/payram/security";

test("verifies the PayRam API-Key webhook header", () => {
  const apiKey = "project-api-key";

  assert.equal(verifyPayRamApiKey(apiKey, apiKey), true);
  assert.equal(verifyPayRamApiKey(` ${apiKey} `, apiKey), true);
  assert.equal(verifyPayRamApiKey("wrong-key", apiKey), false);
  assert.equal(verifyPayRamApiKey(null, apiKey), false);
  assert.equal(verifyPayRamApiKey(apiKey, ""), false);
});

test("hashes replayed webhook bodies to the same deduplication key", () => {
  const body = '{"status":"OPEN","confirmation_current":1}';
  assert.equal(hashRawBody(body), hashRawBody(body));
  assert.notEqual(hashRawBody(body), hashRawBody(`${body} `));
});

test("guest access tokens are opaque and compared by their hash", () => {
  const token = "A".repeat(43);
  const hash = hashGuestAccessToken(token);

  assert.equal(verifyGuestAccessToken(token, hash), true);
  assert.equal(verifyGuestAccessToken("B".repeat(43), hash), false);
  assert.throws(() => hashGuestAccessToken("short"));
});

test("verifies PayRam's HMAC webhook signature over the raw body", async () => {
  const { createHmac } = await import("node:crypto");
  const { authenticatePayRamWebhook, verifyPayRamSignature } = await import(
    "../lib/payram/security"
  );
  const apiKey = "project-api-key";
  const body = '{"reference_id":"r1","status":"FILLED"}';
  const signature = `sha256=${createHmac("sha256", apiKey)
    .update(body)
    .digest("hex")}`;

  assert.equal(verifyPayRamSignature(body, signature, apiKey), true);
  assert.equal(verifyPayRamSignature(`${body} `, signature, apiKey), false);
  assert.equal(verifyPayRamSignature(body, signature, "other-key"), false);

  const base = { rawBody: body, apiKey, requireSignature: false };
  assert.deepEqual(
    authenticatePayRamWebhook({
      ...base,
      signatureHeader: signature,
      apiKeyHeader: null,
    }),
    { ok: true, method: "signature" }
  );
  // A bad signature is rejected even when the legacy header is correct.
  assert.equal(
    authenticatePayRamWebhook({
      ...base,
      signatureHeader: "sha256=deadbeef",
      apiKeyHeader: apiKey,
    }).ok,
    false
  );
  assert.deepEqual(
    authenticatePayRamWebhook({
      ...base,
      signatureHeader: null,
      apiKeyHeader: apiKey,
    }),
    { ok: true, method: "api-key" }
  );
  assert.equal(
    authenticatePayRamWebhook({
      ...base,
      requireSignature: true,
      signatureHeader: null,
      apiKeyHeader: apiKey,
    }).ok,
    false
  );
});
