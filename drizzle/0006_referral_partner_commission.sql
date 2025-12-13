ALTER TABLE "referral_partners"
ADD COLUMN "commission_percent" numeric(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "orders"
ADD COLUMN "referral_commission_percent" numeric(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "orders"
ADD COLUMN "referral_commission_amount" numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE "referral_attributions"
ADD COLUMN "lifetime_commission" numeric(10, 2) NOT NULL DEFAULT 0;

