import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isValidGuestAccessToken(token: string): boolean {
  return GUEST_TOKEN_PATTERN.test(token);
}

export function hashGuestAccessToken(token: string): string {
  if (!isValidGuestAccessToken(token)) {
    throw new Error("Invalid guest access token.");
  }

  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyGuestAccessToken(
  token: string,
  expectedHash: string | null | undefined
): boolean {
  if (!expectedHash || !isValidGuestAccessToken(token)) {
    return false;
  }

  const actualHash = hashGuestAccessToken(token);
  return safeEqual(actualHash, expectedHash);
}

export function hashRawBody(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}

export function verifyPayRamApiKey(
  suppliedApiKey: string | null,
  apiKey: string
): boolean {
  if (!suppliedApiKey?.trim() || !apiKey.trim()) {
    return false;
  }
  return safeEqual(suppliedApiKey.trim(), apiKey.trim());
}

/**
 * Verifies PayRam's `X-Payram-Signature` header: `sha256=<hex>` where the hex
 * is HMAC-SHA256 of the exact raw request body, keyed with the project API key.
 */
export function verifyPayRamSignature(
  rawBody: string,
  signatureHeader: string | null,
  apiKey: string
): boolean {
  const supplied = signatureHeader?.trim().toLowerCase();
  if (!supplied || !apiKey.trim()) {
    return false;
  }

  const digest = createHmac("sha256", apiKey.trim())
    .update(rawBody, "utf8")
    .digest("hex");
  const suppliedDigest = supplied.startsWith("sha256=")
    ? supplied.slice("sha256=".length)
    : supplied;
  return safeEqual(suppliedDigest, digest);
}

export type PayRamWebhookAuthResult =
  | { ok: true; method: "signature" | "api-key" }
  | { ok: false; reason: string };

/**
 * PayRam sends the signed `X-Payram-Signature` header and, for older
 * integrations, the project key verbatim in `API-Key`. A present signature
 * must be valid. The legacy header is accepted only when no signature is sent
 * and `requireSignature` is off (older self-hosted PayRam releases).
 */
export function authenticatePayRamWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
  apiKeyHeader: string | null;
  apiKey: string;
  requireSignature: boolean;
}): PayRamWebhookAuthResult {
  if (input.signatureHeader?.trim()) {
    return verifyPayRamSignature(
      input.rawBody,
      input.signatureHeader,
      input.apiKey
    )
      ? { ok: true, method: "signature" }
      : { ok: false, reason: "Invalid webhook signature." };
  }
  if (input.requireSignature) {
    return { ok: false, reason: "Missing webhook signature." };
  }
  return verifyPayRamApiKey(input.apiKeyHeader, input.apiKey)
    ? { ok: true, method: "api-key" }
    : { ok: false, reason: "Invalid API key." };
}
