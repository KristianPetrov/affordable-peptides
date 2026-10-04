import { beforeAll, beforeEach, afterAll, describe, expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { Secret, TOTP } from "otpauth";
import bcrypt from "bcryptjs";
import * as schema from "../lib/db/schema";
import { createAuthenticator, createRecoveryCodes, decryptMfaSecret, encryptMfaSecret, hashAuthSecret, isFreshAdminAuthentication, matchTotpStep, safeAdminCallback } from "../lib/auth-security";

const mocks = vi.hoisted(() => ({
  db: null as unknown as PgliteDatabase<typeof schema>,
  cookies: new Map<string, string>(),
  sendEmail: vi.fn(),
  cookieSet: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ get db() { return mocks.db; } }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (key: string) => mocks.cookies.has(key) ? { value: mocks.cookies.get(key) } : undefined,
    set: (key: string, value: string, options: unknown) => { mocks.cookies.set(key, value); mocks.cookieSet(key, value, options); },
    delete: (key: string) => mocks.cookies.delete(key),
  }),
}));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.sendEmail }; } }));

let pg: PGlite;
let store: typeof import("../lib/auth-store");
let actions: typeof import("../app/actions/admin-mfa");
let config: typeof import("../auth.config").authConfig;
const adminEmail = "owner@example.test";
const adminPassword = "Correct-test-password!";

beforeAll(async () => {
  vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-more-than-32-characters");
  vi.stubEnv("ADMIN_EMAIL", adminEmail);
  vi.stubEnv("ADMIN_PASSWORD", adminPassword);
  vi.stubEnv("RESEND_API_KEY", "test-api-key");
  vi.stubEnv("VERCEL_ENV", "production");
  pg = new PGlite();
  mocks.db = drizzle(pg, { schema });
  await pg.exec(`CREATE TABLE users (
    id text PRIMARY KEY, name text, email text NOT NULL UNIQUE,
    email_verified timestamp, image text, password text, role varchar(20) NOT NULL DEFAULT 'CUSTOMER',
    created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
  )`);
  const migration = await readFile(new URL("../drizzle/0013_admin_two_factor.sql", import.meta.url), "utf8");
  await pg.exec(migration);
  await pg.exec(migration); // Applying the additive migration twice is safe.
  store = await import("../lib/auth-store");
  actions = await import("../app/actions/admin-mfa");
  config = (await import("../auth.config")).authConfig;
});
beforeEach(async () => {
  await pg.exec("TRUNCATE users, admin_second_factors, auth_rate_limits CASCADE");
  mocks.cookies.clear();
  mocks.sendEmail.mockReset().mockResolvedValue({ data: { id: "local-test-email" }, error: null });
  mocks.cookieSet.mockClear();
  vi.stubEnv("ADMIN_EMAIL", adminEmail);
  vi.stubEnv("ADMIN_PASSWORD", adminPassword);
  vi.stubEnv("VERCEL_ENV", "production");
});
afterAll(async () => { await pg.close(); vi.unstubAllEnvs(); });

async function authorize(email: string, password: string, code = "", enrollmentToken?: string) {
  const provider = config.providers[0] as unknown as { options: { authorize: (credentials: Record<string, unknown>, request: Request) => Promise<unknown> } };
  return provider.options.authorize({ email, password, code, enrollmentToken }, new Request("https://example.test/api/auth/callback/credentials"));
}
async function enroll() {
  expect(await actions.beginAdminMfaSetup(adminEmail, adminPassword)).toEqual({ success: true });
  const email = mocks.sendEmail.mock.calls.at(-1)![0];
  expect(email.to).toBe(adminEmail);
  const code = email.text.match(/code is (\d{8})/)![1];
  const setup = await actions.verifyAdminSetupEmail(code);
  expect(setup.error).toBeUndefined();
  expect(setup.qrCode).toMatch(/^data:image\/png;base64,/);
  const confirmation = await actions.confirmAdminAuthenticator(new TOTP({ secret: setup.secret! }).generate());
  expect(confirmation.error).toBeUndefined();
  const [user] = await mocks.db.select().from(schema.users).where(eq(schema.users.email, adminEmail));
  return { user, secret: setup.secret!, recovery: confirmation.recoveryCodes!, enrollmentToken: confirmation.enrollmentToken! };
}

describe("authenticator cryptography and session policy", () => {
  test("matches the RFC 6238 SHA1 test vector with 6 digits", () => {
    const secret = Secret.fromUTF8("12345678901234567890").base32;
    expect(matchTotpStep(secret, "287082", 59_000)).toBe(1);
    expect(matchTotpStep(secret, "287082", 150_000)).toBeNull();
    expect(matchTotpStep(secret, "28708x", 59_000)).toBeNull();
  });
  test("encrypts secrets with unique nonces and binds them to the user", () => {
    const secret = createAuthenticator(adminEmail).secret;
    const encrypted = encryptMfaSecret(secret, "admin-one");
    expect(encrypted).not.toContain(secret);
    expect(encryptMfaSecret(secret, "admin-one")).not.toBe(encrypted);
    expect(decryptMfaSecret(encrypted, "admin-one")).toBe(secret);
    expect(() => decryptMfaSecret(encrypted, "admin-two")).toThrow();
    expect(() => decryptMfaSecret(encrypted.slice(0, -3) + "xxx", "admin-one")).toThrow();
  });
  test("rejects external and malformed callback URLs", () => {
    for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/account", "/admin/login", "/administrator", "/admin\n"]) expect(safeAdminCallback(value)).toBe("/admin");
    expect(safeAdminCallback("/admin?view=orders")).toBe("/admin?view=orders");
  });
  test("rejects legacy, future-dated and expired admin sessions", () => {
    expect(isFreshAdminAuthentication(undefined, undefined)).toBe(false);
    expect(isFreshAdminAuthentication(1, Date.now() + 10_000)).toBe(false);
    expect(isFreshAdminAuthentication(1, Date.now() - 4 * 3600_000)).toBe(false);
    expect(isFreshAdminAuthentication(1, Date.now())).toBe(true);
  });
});

describe("enrollment and login", () => {
  test("requires password, email possession and authenticator confirmation", async () => {
    expect((await actions.beginAdminMfaSetup(adminEmail, "wrong")).error).toBeTruthy();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect((await actions.verifyAdminSetupEmail("12345678")).error).toBeTruthy();
    const enrolled = await enroll();
    const [factor] = await mocks.db.select().from(schema.adminSecondFactors);
    expect(factor.confirmedAt).toBeTruthy();
    expect(factor.encryptedSecret).not.toContain(enrolled.secret);
    expect(factor.recoveryCodeHashes).toHaveLength(10);
    expect(factor.recoveryCodeHashes).not.toContain(enrolled.recovery[0]);
    expect(factor.emailCodeHash).toBeNull();
    expect(mocks.cookieSet.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: "strict", maxAge: 600 });
    expect((await actions.beginAdminMfaSetup(adminEmail, adminPassword)).error).toMatch(/already set up/);
  });
  test("rejects password-only, incorrect factors and wrong passwords on direct credentials login", async () => {
    expect(await authorize(adminEmail, adminPassword)).toBeNull();
    const enrolled = await enroll();
    expect(await authorize(adminEmail, adminPassword)).toBeNull();
    expect(await authorize(adminEmail, adminPassword, "wrong")).toBeNull();
    expect(await authorize(adminEmail, "wrong", enrolled.recovery[0])).toBeNull();
    expect(await authorize(adminEmail, adminPassword, "", enrolled.enrollmentToken)).toMatchObject({ role: "ADMIN" });
    expect(await authorize(adminEmail, adminPassword, "", enrolled.enrollmentToken)).toBeNull();
  });
  test("allows only one concurrent claim of an authenticator code or recovery code", async () => {
    const enrolled = await enroll();
    const code = new TOTP({ secret: enrolled.secret }).generate({ timestamp: Date.now() + 30_000 });
    const results = await Promise.all([store.verifyAdminSecondFactor(enrolled.user.id, code), store.verifyAdminSecondFactor(enrolled.user.id, code)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const recoveryResults = await Promise.all([store.verifyAdminSecondFactor(enrolled.user.id, enrolled.recovery[0]), store.verifyAdminSecondFactor(enrolled.user.id, enrolled.recovery[0])]);
    expect(recoveryResults.filter(Boolean)).toHaveLength(1);
    expect(await store.verifyAdminSecondFactor(enrolled.user.id, enrolled.recovery[0])).toBe(false);
  });
  test("applies 2FA to additional database admins and preserves customer login", async () => {
    const password = await bcrypt.hash("test-customer-password", 4);
    await mocks.db.insert(schema.users).values([
      { id: "customer", email: "customer@example.test", password, role: "CUSTOMER" },
      { id: "second-admin", email: "second-admin@example.test", password, role: "ADMIN" },
    ]);
    expect(await authorize("customer@example.test", "test-customer-password")).toMatchObject({ role: "CUSTOMER" });
    expect(await authorize("second-admin@example.test", "test-customer-password")).toBeNull();
    const recovery = createRecoveryCodes("second-admin");
    await mocks.db.insert(schema.adminSecondFactors).values({ userId: "second-admin", confirmedAt: new Date(), encryptedSecret: encryptMfaSecret(createAuthenticator(adminEmail).secret, "second-admin"), recoveryCodeHashes: recovery.hashes });
    expect(await authorize("second-admin@example.test", "test-customer-password", recovery.codes[0])).toMatchObject({ role: "ADMIN" });
  });
  test("has no default admin credentials and fails closed on storage errors", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(await authorize("admin@example.com", "admin123")).toBeNull();
    const spy = vi.spyOn(mocks.db, "insert").mockImplementation(() => { throw new Error("database unavailable"); });
    expect(await authorize(adminEmail, adminPassword)).toBeNull();
    spy.mockRestore();
  });
  test("expires setup and locks verification after five guesses", async () => {
    await actions.beginAdminMfaSetup(adminEmail, adminPassword);
    const emailCode = mocks.sendEmail.mock.calls[0][0].text.match(/code is (\d{8})/)![1];
    const wrong = emailCode === "00000000" ? "11111111" : "00000000";
    for (let i = 0; i < 5; i++) expect((await actions.verifyAdminSetupEmail(wrong)).error).toBeTruthy();
    expect((await actions.verifyAdminSetupEmail(emailCode)).error).toBeTruthy();
    await actions.beginAdminMfaSetup(adminEmail, adminPassword);
    const newCode = mocks.sendEmail.mock.calls.at(-1)![0].text.match(/code is (\d{8})/)![1];
    await mocks.db.update(schema.adminSecondFactors).set({ setupExpiresAt: new Date(Date.now() - 1000) });
    expect((await actions.verifyAdminSetupEmail(newCode)).error).toBeTruthy();
  });
  test("rejects forged setup cookies and suppresses enrollment email in Preview", async () => {
    mocks.cookies.set("admin-mfa-setup", "A".repeat(43));
    expect((await actions.verifyAdminSetupEmail("12345678")).error).toBeTruthy();
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await actions.beginAdminMfaSetup(adminEmail, adminPassword)).error).toBeTruthy();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  test("legacy sessions are rejected and revoked admin roles stop existing sessions", async () => {
    const jwt = config.callbacks.jwt;
    const invoke = (token: Record<string, unknown>) => jwt({ token } as Parameters<typeof jwt>[0]);
    expect(await invoke({ id: "admin", role: "ADMIN" })).toBeNull();
    const enrolled = await enroll();
    const token = { id: enrolled.user.id, role: "ADMIN", mfaVersion: 1, mfaVerifiedAt: Date.now() };
    expect(await invoke(token)).toMatchObject({ role: "ADMIN" });
    await mocks.db.update(schema.adminSecondFactors).set({ confirmedAt: new Date(token.mfaVerifiedAt + 1000) });
    expect(await invoke(token)).toBeNull();
    await mocks.db.update(schema.adminSecondFactors).set({ confirmedAt: new Date(token.mfaVerifiedAt - 1000) });
    await mocks.db.update(schema.users).set({ role: "CUSTOMER" }).where(eq(schema.users.id, enrolled.user.id));
    expect(await invoke(token)).toBeNull();
  });
});

test("atomic rate limits enforce the exact maximum under concurrency and reset after expiry", async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => store.checkAuthRateLimit("test", "same-account", 5)));
  expect(results.filter(Boolean)).toHaveLength(5);
  const [bucket] = await mocks.db.select().from(schema.authRateLimits);
  expect(bucket.key).not.toContain("same-account");
  await mocks.db.update(schema.authRateLimits).set({ expiresAt: new Date(Date.now() - 1000) });
  expect(await store.checkAuthRateLimit("test", "same-account", 5)).toBe(true);
  expect(hashAuthSecret("same-account", "limit:test")).toBe(bucket.key);
});
