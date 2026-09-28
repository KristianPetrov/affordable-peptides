import {
  createHash,
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
