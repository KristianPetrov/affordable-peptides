CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "key" text PRIMARY KEY,
  "attempts" integer NOT NULL DEFAULT 1,
  "expires_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "auth_rate_limits_expires_idx" ON "auth_rate_limits" ("expires_at");

CREATE TABLE IF NOT EXISTS "admin_second_factors" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "encrypted_secret" text,
  "confirmed_at" timestamp with time zone,
  "last_used_step" bigint NOT NULL DEFAULT -1,
  "recovery_code_hashes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "setup_token_hash" text,
  "email_code_hash" text,
  "setup_expires_at" timestamp with time zone,
  "setup_attempts" integer NOT NULL DEFAULT 0,
  "email_verified_at" timestamp with time zone,
  "enrollment_token_hash" text,
  "enrollment_token_expires_at" timestamp with time zone
);
