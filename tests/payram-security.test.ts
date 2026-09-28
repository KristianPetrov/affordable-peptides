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
