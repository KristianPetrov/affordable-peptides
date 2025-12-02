CREATE TABLE "referral_partners" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "notes" text,
  "default_discount_type" varchar(10) NOT NULL DEFAULT 'percent',
  "default_discount_value" numeric(10, 2) NOT NULL DEFAULT 0,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "referral_partners_contact_email_idx" ON "referral_partners" ("contact_email");

CREATE TABLE "referral_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "partner_id" text NOT NULL REFERENCES "referral_partners"("id") ON DELETE cascade,
  "code" varchar(64) NOT NULL,
  "description" text,
  "discount_type" varchar(10) NOT NULL DEFAULT 'percent',
  "discount_value" numeric(10, 2) NOT NULL DEFAULT 0,
  "max_redemptions_per_customer" integer NOT NULL DEFAULT 1,
  "max_total_redemptions" integer,
  "current_redemptions" integer NOT NULL DEFAULT 0,
  "starts_at" timestamp,
  "expires_at" timestamp,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "referral_codes_code_unique" UNIQUE ("code")
);

CREATE TABLE "referral_attributions" (
  "id" text PRIMARY KEY NOT NULL,
  "partner_id" text NOT NULL REFERENCES "referral_partners"("id") ON DELETE cascade,
  "code_id" text REFERENCES "referral_codes"("id") ON DELETE set null,
  "customer_email" text NOT NULL,
  "customer_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "customer_name" text,
  "first_order_id" text,
  "first_order_number" varchar(50),
  "first_order_discount" numeric(10, 2) NOT NULL DEFAULT 0,
  "lifetime_revenue" numeric(10, 2) NOT NULL DEFAULT 0,
  "total_orders" integer NOT NULL DEFAULT 0,
  "last_order_id" text,
  "last_order_number" varchar(50),
  "last_order_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "referral_attributions_customer_email_unique" UNIQUE ("customer_email")
);

CREATE INDEX "referral_attributions_partner_idx" ON "referral_attributions" ("partner_id");
CREATE INDEX "referral_codes_partner_idx" ON "referral_codes" ("partner_id");

ALTER TABLE "orders" ADD COLUMN "referral_partner_id" text REFERENCES "referral_partners"("id") ON DELETE set null;
ALTER TABLE "orders" ADD COLUMN "referral_partner_name" text;
ALTER TABLE "orders" ADD COLUMN "referral_code_id" text REFERENCES "referral_codes"("id") ON DELETE set null;
ALTER TABLE "orders" ADD COLUMN "referral_code_value" text;
ALTER TABLE "orders" ADD COLUMN "referral_attribution_id" text;
ALTER TABLE "orders" ADD COLUMN "referral_discount" numeric(10, 2) NOT NULL DEFAULT 0;


