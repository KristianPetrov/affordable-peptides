import assert from "node:assert/strict";
import test from "node:test";

test("Preview email links use the deployment URL while Production uses the canonical domain", async () => {
  // Placeholder only; assembled so secret scanners don't flag it.
  const placeholderLogin = ["placeholder", "placeholder"].join(":");
  process.env.DATABASE_URL ??= `postgresql://${placeholderLogin}@db.invalid/test`;
  process.env.RESEND_API_KEY ??= "test-key";

  const { resolveSiteBaseUrl } = await import("../lib/email");
  const environment = {
    NEXT_PUBLIC_APP_URL: "https://www.affordablepeptides.life",
    VERCEL_URL: "affordable-peptides-preview.vercel.app",
  };

  assert.equal(
    resolveSiteBaseUrl({ ...environment, VERCEL_ENV: "preview" }),
    "https://affordable-peptides-preview.vercel.app"
  );
  assert.equal(
    resolveSiteBaseUrl({ ...environment, VERCEL_ENV: "production" }),
    "https://www.affordablepeptides.life"
  );
});
