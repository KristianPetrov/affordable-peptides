"use server";

import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { Resend } from "resend";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { adminSecondFactors, users } from "@/lib/db/schema";
import { createAuthenticator, createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, equalSecrets, hashAuthSecret, matchTotpStep } from "@/lib/auth-security";
import { checkAuthRateLimit, limitLogin, loginClientIp, verifyLoginPassword } from "@/lib/auth-store";

const SETUP_COOKIE = process.env.NODE_ENV === "production" ? "__Host-admin-mfa-setup" : "admin-mfa-setup";
const SETUP_ERROR = "Unable to verify setup. Check your code or restart setup.";

export async function beginAdminMfaSetup(email: string, password: string) {
  try {
    if (typeof email !== "string" || typeof password !== "string") return { error: "Invalid credentials." };
    email = email.trim().toLowerCase();
    if (!email || email.length > 254 || !password || Buffer.byteLength(password, "utf8") > 72) return { error: "Invalid credentials." };
    const requestHeaders = await headers();
    if (!await limitLogin(email, requestHeaders)) return { error: "Too many attempts. Try again in 15 minutes." };
    const user = await verifyLoginPassword(email, password);
    if (!user || user.role !== "ADMIN") return { error: "Invalid credentials." };
    const [existing] = await db.select().from(adminSecondFactors).where(eq(adminSecondFactors.userId, user.id)).limit(1);
    if (existing?.confirmedAt) return { error: "An authenticator is already set up. Sign in with an authenticator or recovery code." };
    if (!process.env.RESEND_API_KEY || process.env.VERCEL_ENV === "preview") return { error: "Authenticator enrollment is available on the production site." };
    if (!await checkAuthRateLimit("setup-email", user.id, 3)) return { error: "Too many setup requests. Try again in 15 minutes." };
    const setupToken = randomBytes(32).toString("base64url");
    const code = randomInt(100_000_000).toString().padStart(8, "0");
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const pending = {
      setupTokenHash: hashAuthSecret(setupToken, "setup-token"),
      emailCodeHash: hashAuthSecret(code, `setup-email:${user.id}`),
      setupExpiresAt: expiresAt,
      setupAttempts: 0,
      emailVerifiedAt: null,
      encryptedSecret: null,
    };
    const [saved] = await db.insert(adminSecondFactors).values({ userId: user.id, ...pending }).onConflictDoUpdate({
      target: adminSecondFactors.userId, set: pending, setWhere: isNull(adminSecondFactors.confirmedAt),
    }).returning({ userId: adminSecondFactors.userId });
    if (!saved) return { error: SETUP_ERROR };
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "orders@mail.affordablepeptides.life",
      to: user.email,
      subject: "Confirm your admin authenticator setup",
      text: `Your Affordable Peptides admin setup code is ${code}. It expires in 10 minutes. Enter it only on the Affordable Peptides admin login page. If you did not request this, do not share this code and change your admin password.`,
    });
    if (result.error || !result.data?.id) throw new Error("Delivery failed");
    (await cookies()).set(SETUP_COOKIE, setupToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600 });
    return { success: true };
  } catch {
    console.error("[auth] Admin authenticator setup unavailable");
    return { error: "Unable to start setup. Try again later." };
  }
}

async function claimSetupAttempt() {
  const token = (await cookies()).get(SETUP_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const requestHeaders = await headers();
  if (!await checkAuthRateLimit("setup-ip", loginClientIp(requestHeaders), 30)) return null;
  const [factor] = await db.update(adminSecondFactors).set({ setupAttempts: sql`${adminSecondFactors.setupAttempts} + 1` }).where(and(
    eq(adminSecondFactors.setupTokenHash, hashAuthSecret(token, "setup-token")),
    gt(adminSecondFactors.setupExpiresAt, new Date()),
    lt(adminSecondFactors.setupAttempts, 5),
    isNull(adminSecondFactors.confirmedAt),
  )).returning();
  return factor ?? null;
}

export async function verifyAdminSetupEmail(code: string) {
  try {
    if (typeof code !== "string" || !/^\d{8}$/.test(code)) return { error: SETUP_ERROR };
    const factor = await claimSetupAttempt();
    if (!factor || factor.emailVerifiedAt || !factor.emailCodeHash || !equalSecrets(factor.emailCodeHash, hashAuthSecret(code, `setup-email:${factor.userId}`))) return { error: SETUP_ERROR };
    const [user] = await db.select({ email: users.email, role: users.role }).from(users).where(eq(users.id, factor.userId));
    if (!user || user.role !== "ADMIN") return { error: SETUP_ERROR };
    const authenticator = createAuthenticator(user.email);
    const [verified] = await db.update(adminSecondFactors).set({
      emailVerifiedAt: new Date(), emailCodeHash: null, setupAttempts: 0,
      encryptedSecret: encryptMfaSecret(authenticator.secret, factor.userId),
    }).where(and(
      eq(adminSecondFactors.userId, factor.userId),
      eq(adminSecondFactors.setupTokenHash, factor.setupTokenHash!),
      eq(adminSecondFactors.emailCodeHash, factor.emailCodeHash),
      isNull(adminSecondFactors.emailVerifiedAt),
      isNull(adminSecondFactors.confirmedAt),
      gt(adminSecondFactors.setupExpiresAt, new Date()),
    )).returning({ userId: adminSecondFactors.userId });
    if (!verified) return { error: SETUP_ERROR };
    return { secret: authenticator.secret, qrCode: await QRCode.toDataURL(authenticator.uri, { width: 240, margin: 2 }) };
  } catch { return { error: SETUP_ERROR }; }
}

export async function confirmAdminAuthenticator(code: string) {
  try {
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) return { error: SETUP_ERROR };
    const factor = await claimSetupAttempt();
    if (!factor?.emailVerifiedAt || !factor.encryptedSecret) return { error: SETUP_ERROR };
    const step = matchTotpStep(decryptMfaSecret(factor.encryptedSecret, factor.userId), code);
    if (step === null) return { error: SETUP_ERROR };
    const recovery = createRecoveryCodes(factor.userId);
    const enrollmentToken = randomBytes(32).toString("base64url");
    const [confirmed] = await db.update(adminSecondFactors).set({
      confirmedAt: new Date(), lastUsedStep: step, recoveryCodeHashes: recovery.hashes,
      setupTokenHash: null, setupExpiresAt: null, emailCodeHash: null,
      enrollmentTokenHash: hashAuthSecret(enrollmentToken, `enrollment:${factor.userId}`),
      enrollmentTokenExpiresAt: new Date(Date.now() + 10 * 60_000),
    }).where(and(
      eq(adminSecondFactors.userId, factor.userId),
      eq(adminSecondFactors.setupTokenHash, factor.setupTokenHash!),
      eq(adminSecondFactors.encryptedSecret, factor.encryptedSecret),
      isNull(adminSecondFactors.confirmedAt),
      gt(adminSecondFactors.setupExpiresAt, new Date()),
    )).returning({ userId: adminSecondFactors.userId });
    if (!confirmed) return { error: SETUP_ERROR };
    (await cookies()).delete(SETUP_COOKIE);
    return { recoveryCodes: recovery.codes, enrollmentToken };
  } catch { return { error: SETUP_ERROR }; }
}
