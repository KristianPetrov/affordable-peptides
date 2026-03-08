ALTER TABLE "orders"
ADD COLUMN "payment_method" varchar(20) NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "payment_transaction_id" text,
ADD COLUMN "paid_at" timestamp;

UPDATE "orders"
SET
  "payment_method" = COALESCE("payment_method", 'MANUAL'),
  "paid_at" = CASE
    WHEN "paid_at" IS NOT NULL THEN "paid_at"
    WHEN "status" IN ('PAID', 'SHIPPED') THEN "updated_at"
    ELSE NULL
  END;
