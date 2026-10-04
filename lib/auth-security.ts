import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Secret, TOTP } from "otpauth";

export const ADMIN_MFA_VERSION = 1;
export const ADMIN_SESSION_SECONDS = 4 * 60 * 60;

function authKey() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("A strong AUTH_SECRET is required for admin 2FA");
  return createHash("sha256").update(`admin-mfa:v1:${secret}`).digest();
}

export function equalSecrets(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export function hashAuthSecret(value: string, purpose: string) {
  return createHmac("sha256", authKey()).update(`${purpose}:${value}`).digest("hex");
}

export function encryptMfaSecret(secret: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString("base64url")).join(".");
}

export function decryptMfaSecret(encrypted: string, userId: string) {
  const [iv, tag, ciphertext] = encrypted.split(".").map(part => Buffer.from(part, "base64url"));
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted authenticator secret");
  const cipher = createDecipheriv("aes-256-gcm", authKey(), iv);
  cipher.setAAD(Buffer.from(userId));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString("utf8");
}

export function createAuthenticator(email: string, secret = new Secret({ size: 20 }).base32) {
  const totp = new TOTP({ issuer: "Affordable Peptides", label: email, algorithm: "SHA1", digits: 6, period: 30, secret });
  return { secret, uri: totp.toString() };
}

export function matchTotpStep(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const delta = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 }).validate({ token: code, timestamp: now, window: 1 });
  return delta === null ? null : Math.floor(now / 30_000) + delta;
}

export function normalizeRecoveryCode(value: string) {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

export function createRecoveryCodes(userId: string) {
  const codes = Array.from({ length: 10 }, () => randomBytes(10).toString("hex").toUpperCase().match(/.{4}/g)!.join("-"));
  return { codes, hashes: codes.map(code => hashAuthSecret(normalizeRecoveryCode(code), `recovery:${userId}`)) };
}

export function safeAdminCallback(value?: string) {
  if (!value || /[\\\x00-\x20]/.test(value)) return "/admin";
  try {
    const url = new URL(value, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || !(url.pathname === "/admin" || url.pathname.startsWith("/admin/")) || url.pathname === "/admin/login") return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/admin"; }
}

export function isFreshAdminAuthentication(version: unknown, verifiedAt: unknown, now = Date.now()) {
  return version === ADMIN_MFA_VERSION && typeof verifiedAt === "number" && verifiedAt <= now && now - verifiedAt < ADMIN_SESSION_SECONDS * 1000;
}
