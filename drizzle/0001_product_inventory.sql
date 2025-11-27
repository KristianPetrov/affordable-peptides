CREATE TABLE IF NOT EXISTS "product_inventory" (
    "id" text PRIMARY KEY NOT NULL,
    "product_slug" text NOT NULL,
    "variant_label" text NOT NULL,
    "stock" integer NOT NULL DEFAULT 0,
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_inventory_product_variant_idx"
  ON "product_inventory" ("product_slug", "variant_label");

