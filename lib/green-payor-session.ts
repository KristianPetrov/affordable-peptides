import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ap_gm_payor";

function getSigningSecret (): string
{
  const secret =
    process.env.GREEN_PAYOR_COOKIE_SECRET?.trim() ||
    process.env.GREEN_API_PASSWORD?.trim() ||
    "";
  if (!secret) {
    throw new Error(
      "Set GREEN_PAYOR_COOKIE_SECRET (recommended) or GREEN_API_PASSWORD for Plaid payor session signing."
    );
  }
  return secret;
}

function signPayorId (payorId: string): string
{
  return createHmac("sha256", getSigningSecret())
    .update(payorId, "utf8")
    .digest("base64url");
}

export function buildGreenPayorCookieValue (payorId: string): string
{
  const encoded = Buffer.from(payorId, "utf8").toString("base64url");
  return `${encoded}.${signPayorId(payorId)}`;
}

export function parseGreenPayorCookieValue (raw: string): string | null
{
  const trimmed = raw.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const encoded = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  let payorId: string;
  try {
    payorId = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!payorId) {
    return null;
  }
  const expected = signPayorId(payorId);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return null;
  }
  if (!timingSafeEqual(a, b)) {
    return null;
  }
  return payorId;
}

export async function setCheckoutGreenPayorCookie (payorId: string): Promise<void>
{
  const jar = await cookies();
  jar.set(COOKIE_NAME, buildGreenPayorCookieValue(payorId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function readCheckoutGreenPayorId (): Promise<string | null>
{
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  return parseGreenPayorCookieValue(raw);
}

export async function assertCheckoutGreenPayorMatches (
  payorId: string
): Promise<void>
{
  const expected = await readCheckoutGreenPayorId();
  if (!expected || expected !== payorId.trim()) {
    throw new Error(
      "Your bank linking session expired or is invalid. Start Plaid linking again."
    );
  }
}

export async function clearCheckoutGreenPayorCookie (): Promise<void>
{
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
