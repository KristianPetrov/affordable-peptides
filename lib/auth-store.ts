import bcrypt from "bcryptjs";
import { and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { adminSecondFactors, authRateLimits, users } from "@/lib/db/schema";
import { decryptMfaSecret, equalSecrets, hashAuthSecret, matchTotpStep, normalizeRecoveryCode } from "@/lib/auth-security";

// Atomic database counters are shared by every serverless instance. Never fall back
// to a per-process limiter when the database is unavailable.
export async function checkAuthRateLimit(scope: string, value: string, max: number, seconds = 900) {
  const key = hashAuthSecret(value.toLowerCase(), `limit:${scope}`);
  const [bucket] = await db.insert(authRateLimits).values({ key, expiresAt: new Date(Date.now() + seconds * 1000) }).onConflictDoUpdate({
    target: authRateLimits.key,
    set: {
      attempts: sql`CASE WHEN ${authRateLimits.expiresAt} <= now() THEN 1 ELSE ${authRateLimits.attempts} + 1 END`,
      expiresAt: sql`CASE WHEN ${authRateLimits.expiresAt} <= now() THEN now() + ${seconds} * interval '1 second' ELSE ${authRateLimits.expiresAt} END`,
    },
    setWhere: sql`${authRateLimits.expiresAt} <= now() OR ${authRateLimits.attempts} < ${max}`,
  }).returning({ attempts: authRateLimits.attempts });
  if (bucket && randomInt(100) === 0) await db.delete(authRateLimits).where(lt(authRateLimits.expiresAt, new Date(Date.now() - 86400_000)));
  return Boolean(bucket && bucket.attempts <= max);
}

export function loginClientIp(headers: Headers) {
  // Vercel overwrites this header; do not trust arbitrary forwarded IP headers.
  return process.env.VERCEL ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
}

export async function limitLogin(email: string, headers: Headers) {
  return await checkAuthRateLimit("login-ip", loginClientIp(headers), 30) && await checkAuthRateLimit("login-email", email, 10);
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`).limit(1);
  return user ?? null;
}

export async function verifyLoginPassword(email: string, password: string) {
  if (!email || email.length > 254 || !password || Buffer.byteLength(password, "utf8") > 72) return null;
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (configuredEmail && email.toLowerCase() === configuredEmail) {
    if (!configuredPassword || !equalSecrets(password, configuredPassword)) return null;
    const existing = await findUserByEmail(email);
    if (existing) {
      if (existing.role !== "ADMIN") {
        const [admin] = await db.update(users).set({ role: "ADMIN", updatedAt: new Date() }).where(eq(users.id, existing.id)).returning();
        return admin;
      }
      return existing;
    }
    await db.insert(users).values({ id: randomUUID(), email: configuredEmail, name: process.env.ADMIN_NAME?.trim() || "Admin", password: await bcrypt.hash(configuredPassword, 12), role: "ADMIN" }).onConflictDoNothing();
    return findUserByEmail(email);
  }
  const user = await findUserByEmail(email);
  // Always perform bcrypt work, including for unknown users.
  const valid = await bcrypt.compare(password, user?.password || "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxj6o5vj87mXXWLdaEUCdtnvl0e");
  return valid && user?.password ? user : null;
}

export async function verifyAdminSecondFactor(userId: string, code: string, enrollmentToken?: string) {
  const [factor] = await db.select().from(adminSecondFactors).where(eq(adminSecondFactors.userId, userId)).limit(1);
  if (!factor?.confirmedAt || !factor.encryptedSecret) return false;
  if (enrollmentToken && /^[A-Za-z0-9_-]{43}$/.test(enrollmentToken)) {
    const [claimed] = await db.update(adminSecondFactors).set({ enrollmentTokenHash: null, enrollmentTokenExpiresAt: null }).where(and(
      eq(adminSecondFactors.userId, userId),
      eq(adminSecondFactors.enrollmentTokenHash, hashAuthSecret(enrollmentToken, `enrollment:${userId}`)),
      gt(adminSecondFactors.enrollmentTokenExpiresAt, new Date()),
    )).returning({ userId: adminSecondFactors.userId });
    return Boolean(claimed);
  }
  const normalized = normalizeRecoveryCode(code);
  if (/^[A-F0-9]{20}$/.test(normalized)) {
    const hash = hashAuthSecret(normalized, `recovery:${userId}`);
    const [claimed] = await db.update(adminSecondFactors).set({ recoveryCodeHashes: sql`${adminSecondFactors.recoveryCodeHashes} - ${hash}` }).where(and(
      eq(adminSecondFactors.userId, userId),
      sql`${adminSecondFactors.recoveryCodeHashes} ? ${hash}`,
    )).returning({ userId: adminSecondFactors.userId });
    return Boolean(claimed);
  }
  const step = matchTotpStep(decryptMfaSecret(factor.encryptedSecret, userId), code);
  if (step === null) return false;
  const [claimed] = await db.update(adminSecondFactors).set({ lastUsedStep: step }).where(and(
    eq(adminSecondFactors.userId, userId),
    isNotNull(adminSecondFactors.confirmedAt),
    lt(adminSecondFactors.lastUsedStep, step),
  )).returning({ userId: adminSecondFactors.userId });
  return Boolean(claimed);
}
