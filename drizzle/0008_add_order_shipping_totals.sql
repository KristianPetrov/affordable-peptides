ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_cost" numeric(10, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "total_amount" numeric(10, 2);
