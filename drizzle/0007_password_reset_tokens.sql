CREATE TABLE "password_reset_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_unique"
ON "password_reset_tokens" ("token_hash");

CREATE INDEX "password_reset_tokens_user_idx"
ON "password_reset_tokens" ("user_id");

CREATE INDEX "password_reset_tokens_expires_idx"
ON "password_reset_tokens" ("expires_at");

