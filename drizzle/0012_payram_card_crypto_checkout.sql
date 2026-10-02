ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_method" varchar(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "guest_access_token_hash" text,
  ADD COLUMN IF NOT EXISTS "inventory_reservation_status" varchar(20) NOT NULL DEFAULT 'RESERVED',
  ADD COLUMN IF NOT EXISTS "inventory_released_at" timestamp,
  ADD COLUMN IF NOT EXISTS "paid_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_unique"
  ON "orders" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "orders_guest_access_token_hash_idx"
  ON "orders" ("guest_access_token_hash");

UPDATE "orders"
SET
  "inventory_reservation_status" = 'RELEASED',
  "inventory_released_at" = COALESCE("inventory_released_at", "updated_at")
WHERE "status" = 'CANCELLED';

UPDATE "orders"
SET "paid_at" = COALESCE("paid_at", "updated_at")
WHERE "status" IN ('PAID', 'SHIPPED');

CREATE TABLE IF NOT EXISTS "payment_attempts" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "provider" varchar(32) NOT NULL,
  "provider_reference" text,
  "invoice_id" text NOT NULL,
  "invoice_amount" numeric(12, 2) NOT NULL,
  "settlement_asset" varchar(16) NOT NULL,
  "settlement_network" varchar(32) NOT NULL,
  "token_address" text,
  "status" varchar(40) NOT NULL,
  "provider_status" varchar(40),
  "payment_url" text,
  "receiving_address" text,
  "filled_amount" numeric(36, 18),
  "filled_amount_usd" numeric(12, 2),
  "deposit_transaction_hashes" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "confirmation_current" integer NOT NULL DEFAULT 0,
  "confirmation_required" integer NOT NULL DEFAULT 0,
  "review_reason" text,
  "reconciliation_error" text,
  "expires_at" timestamp,
  "last_provider_event_at" timestamp,
  "last_reconciled_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_provider_reference_unique"
  ON "payment_attempts" ("provider", "provider_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_invoice_id_unique"
  ON "payment_attempts" ("invoice_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_order_idx"
  ON "payment_attempts" ("order_id");
CREATE INDEX IF NOT EXISTS "payment_attempts_status_updated_idx"
  ON "payment_attempts" ("status", "updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_one_active_payram_order"
  ON "payment_attempts" ("order_id")
  WHERE "provider" = 'payram'
    AND "status" IN (
      'CREATING',
      'OPEN',
      'CONFIRMING',
      'PARTIALLY_FILLED',
      'RECONCILIATION_REQUIRED'
    );

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" text PRIMARY KEY,
  "provider" varchar(32) NOT NULL,
  "payment_attempt_id" text REFERENCES "payment_attempts"("id") ON DELETE SET NULL,
  "provider_reference" text,
  "invoice_id" text,
  "provider_status" varchar(40),
  "raw_body_hash" text NOT NULL,
  "payload" jsonb NOT NULL,
  "processing_status" varchar(24) NOT NULL DEFAULT 'RECEIVED',
  "processing_result" text,
  "processing_error" text,
  "provider_timestamp" timestamp,
  "received_at" timestamp NOT NULL DEFAULT now(),
  "processed_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_raw_body_hash_unique"
  ON "payment_events" ("provider", "raw_body_hash");
CREATE INDEX IF NOT EXISTS "payment_events_attempt_idx"
  ON "payment_events" ("payment_attempt_id");

CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "payment_attempt_id" text REFERENCES "payment_attempts"("id") ON DELETE RESTRICT,
  "approved_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "recipient_address" text NOT NULL,
  "recipient_verified_at" timestamp NOT NULL,
  "amount" numeric(36, 18) NOT NULL,
  "asset" varchar(16) NOT NULL,
  "network" varchar(32) NOT NULL,
  "status" varchar(24) NOT NULL,
  "transaction_hash" text,
  "notes" text,
  "sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_transaction_hash_unique"
  ON "payment_refunds" ("transaction_hash");
CREATE INDEX IF NOT EXISTS "payment_refunds_order_idx"
  ON "payment_refunds" ("order_id");

CREATE TABLE IF NOT EXISTS "treasury_sweeps" (
  "id" text PRIMARY KEY,
  "payment_attempt_id" text NOT NULL REFERENCES "payment_attempts"("id") ON DELETE RESTRICT,
  "deposit_transaction_hash" text NOT NULL,
  "sweep_transaction_hash" text NOT NULL,
  "destination_address" text NOT NULL,
  "amount" numeric(36, 18) NOT NULL,
  "asset" varchar(16) NOT NULL,
  "network" varchar(32) NOT NULL,
  "status" varchar(24) NOT NULL,
  "confirmed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "treasury_sweeps_transaction_hash_unique"
  ON "treasury_sweeps" ("sweep_transaction_hash");
CREATE INDEX IF NOT EXISTS "treasury_sweeps_attempt_idx"
  ON "treasury_sweeps" ("payment_attempt_id");

CREATE TABLE IF NOT EXISTS "email_outbox" (
  "id" text PRIMARY KEY,
  "order_id" text NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "event_type" varchar(40) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'PENDING',
  "attempts" integer NOT NULL DEFAULT 0,
  "next_attempt_at" timestamp NOT NULL DEFAULT now(),
  "locked_until" timestamp,
  "last_error" text,
  "sent_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_order_event_unique"
  ON "email_outbox" ("order_id", "event_type");
CREATE INDEX IF NOT EXISTS "email_outbox_pending_idx"
  ON "email_outbox" ("status", "next_attempt_at");

CREATE OR REPLACE FUNCTION create_order_with_inventory_reservation(
  p_order jsonb,
  p_inventory_items jsonb,
  p_attempt jsonb DEFAULT NULL
)
RETURNS TABLE(order_id text, created boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id text;
  v_inventory_item jsonb;
  v_quantity integer;
BEGIN
  IF COALESCE(p_order->>'idempotencyKey', '') = '' THEN
    RAISE EXCEPTION 'MISSING_IDEMPOTENCY_KEY';
  END IF;

  SELECT "id"
  INTO v_order_id
  FROM "orders"
  WHERE "idempotency_key" = p_order->>'idempotencyKey';

  IF v_order_id IS NOT NULL THEN
    RETURN QUERY SELECT v_order_id, false;
    RETURN;
  END IF;

  INSERT INTO "orders" (
    "id",
    "order_number",
    "status",
    "user_id",
    "payment_method",
    "idempotency_key",
    "guest_access_token_hash",
    "inventory_reservation_status",
    "customer_name",
    "customer_email",
    "customer_phone",
    "shipping_address",
    "items",
    "subtotal",
    "shipping_cost",
    "total_amount",
    "total_units",
    "referral_partner_id",
    "referral_partner_name",
    "referral_code_id",
    "referral_code_value",
    "referral_attribution_id",
    "referral_discount",
    "referral_commission_percent",
    "referral_commission_amount",
    "created_at",
    "updated_at"
  )
  VALUES (
    p_order->>'id',
    p_order->>'orderNumber',
    'PENDING_PAYMENT',
    NULLIF(p_order->>'userId', ''),
    p_order->>'paymentMethod',
    p_order->>'idempotencyKey',
    p_order->>'guestAccessTokenHash',
    'RESERVED',
    p_order->>'customerName',
    p_order->>'customerEmail',
    p_order->>'customerPhone',
    p_order->'shippingAddress',
    p_order->'items',
    (p_order->>'subtotal')::numeric,
    (p_order->>'shippingCost')::numeric,
    (p_order->>'totalAmount')::numeric,
    (p_order->>'totalUnits')::integer,
    NULLIF(p_order->>'referralPartnerId', ''),
    NULLIF(p_order->>'referralPartnerName', ''),
    NULLIF(p_order->>'referralCodeId', ''),
    NULLIF(p_order->>'referralCodeValue', ''),
    NULLIF(p_order->>'referralAttributionId', ''),
    COALESCE((p_order->>'referralDiscount')::numeric, 0),
    COALESCE((p_order->>'referralCommissionPercent')::numeric, 0),
    COALESCE((p_order->>'referralCommissionAmount')::numeric, 0),
    now(),
    now()
  )
  ON CONFLICT ("idempotency_key") DO NOTHING
  RETURNING "id" INTO v_order_id;

  IF v_order_id IS NULL THEN
    SELECT "id"
    INTO v_order_id
    FROM "orders"
    WHERE "idempotency_key" = p_order->>'idempotencyKey';

    IF v_order_id IS NULL THEN
      RAISE EXCEPTION 'ORDER_IDEMPOTENCY_CONFLICT';
    END IF;

    RETURN QUERY SELECT v_order_id, false;
    RETURN;
  END IF;

  IF jsonb_typeof(p_inventory_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_INVENTORY_RESERVATION';
  END IF;

  FOR v_inventory_item IN
    SELECT value
    FROM jsonb_array_elements(p_inventory_items)
    ORDER BY value->>'productSlug', value->>'variantLabel'
  LOOP
    v_quantity := (v_inventory_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'INVALID_INVENTORY_QUANTITY';
    END IF;

    UPDATE "product_inventory"
    SET
      "stock" = "stock" - v_quantity,
      "updated_at" = now()
    WHERE "product_slug" = v_inventory_item->>'productSlug'
      AND "variant_label" = v_inventory_item->>'variantLabel'
      AND "stock" >= v_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY:%:%',
        v_inventory_item->>'productSlug',
        v_inventory_item->>'variantLabel';
    END IF;
  END LOOP;

  IF p_attempt IS NOT NULL THEN
    INSERT INTO "payment_attempts" (
      "id",
      "order_id",
      "provider",
      "invoice_id",
      "invoice_amount",
      "settlement_asset",
      "settlement_network",
      "token_address",
      "status",
      "expires_at",
      "created_at",
      "updated_at"
    )
    VALUES (
      p_attempt->>'id',
      v_order_id,
      'payram',
      p_attempt->>'invoiceId',
      (p_attempt->>'invoiceAmount')::numeric,
      'USDC',
      'BASE',
      p_attempt->>'tokenAddress',
      'CREATING',
      (p_attempt->>'expiresAt')::timestamp,
      now(),
      now()
    );
  END IF;

  RETURN QUERY SELECT v_order_id, true;
END;
$$;

CREATE OR REPLACE FUNCTION apply_payram_payment_update(
  p_attempt_id text,
  p_update jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id text;
  v_order_status varchar(20);
  v_should_pay boolean;
  v_attempt_status varchar(40);
BEGIN
  SELECT "order_id"
  INTO v_order_id
  FROM "payment_attempts"
  WHERE "id" = p_attempt_id
  FOR UPDATE;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  v_should_pay := COALESCE((p_update->>'shouldPay')::boolean, false);
  v_attempt_status := p_update->>'attemptStatus';

  UPDATE "payment_attempts"
  SET
    "provider_status" = NULLIF(p_update->>'providerStatus', ''),
    "status" = v_attempt_status,
    "token_address" = COALESCE(NULLIF(p_update->>'tokenAddress', ''), "token_address"),
    "receiving_address" = COALESCE(NULLIF(p_update->>'receivingAddress', ''), "receiving_address"),
    "filled_amount" = CASE
      WHEN NULLIF(p_update->>'filledAmount', '') IS NULL THEN "filled_amount"
      ELSE (p_update->>'filledAmount')::numeric
    END,
    "filled_amount_usd" = CASE
      WHEN NULLIF(p_update->>'filledAmountUsd', '') IS NULL THEN "filled_amount_usd"
      ELSE (p_update->>'filledAmountUsd')::numeric
    END,
    "deposit_transaction_hashes" = COALESCE(
      p_update->'depositTransactionHashes',
      "deposit_transaction_hashes"
    ),
    "confirmation_current" = COALESCE(
      (p_update->>'confirmationCurrent')::integer,
      "confirmation_current"
    ),
    "confirmation_required" = COALESCE(
      (p_update->>'confirmationRequired')::integer,
      "confirmation_required"
    ),
    "review_reason" = NULLIF(p_update->>'reviewReason', ''),
    "reconciliation_error" = NULLIF(p_update->>'reconciliationError', ''),
    "last_provider_event_at" = CASE
      WHEN NULLIF(p_update->>'providerTimestamp', '') IS NULL
        THEN "last_provider_event_at"
      ELSE (p_update->>'providerTimestamp')::timestamp
    END,
    "last_reconciled_at" = now(),
    "updated_at" = now()
  WHERE "id" = p_attempt_id;

  IF NOT v_should_pay THEN
    RETURN v_attempt_status;
  END IF;

  SELECT "status"
  INTO v_order_status
  FROM "orders"
  WHERE "id" = v_order_id
  FOR UPDATE;

  IF v_order_status = 'CANCELLED' THEN
    UPDATE "payment_attempts"
    SET
      "status" = 'REVIEW_REQUIRED',
      "review_reason" = 'LATE_PAYMENT_AFTER_CANCELLATION',
      "updated_at" = now()
    WHERE "id" = p_attempt_id;
    RETURN 'REVIEW_CANCELLED';
  END IF;

  IF v_order_status = 'PAID' THEN
    RETURN 'ALREADY_PAID';
  END IF;

  IF v_order_status = 'SHIPPED' THEN
    RETURN 'ALREADY_SHIPPED';
  END IF;

  IF v_order_status <> 'PENDING_PAYMENT' THEN
    UPDATE "payment_attempts"
    SET
      "status" = 'REVIEW_REQUIRED',
      "review_reason" = 'INVALID_ORDER_STATE',
      "updated_at" = now()
    WHERE "id" = p_attempt_id;
    RETURN 'REVIEW_INVALID_ORDER_STATE';
  END IF;

  UPDATE "orders"
  SET
    "status" = 'PAID',
    "paid_at" = COALESCE("paid_at", now()),
    "updated_at" = now()
  WHERE "id" = v_order_id
    AND "status" = 'PENDING_PAYMENT';

  IF NOT FOUND THEN
    RETURN 'NO_TRANSITION';
  END IF;

  INSERT INTO "email_outbox" (
    "id",
    "order_id",
    "event_type",
    "payload",
    "status",
    "next_attempt_at",
    "created_at",
    "updated_at"
  )
  VALUES (
    'payment-confirmed:' || v_order_id,
    v_order_id,
    'PAYMENT_CONFIRMED',
    COALESCE(p_update->'emailPayload', '{}'::jsonb),
    'PENDING',
    now(),
    now(),
    now()
  )
  ON CONFLICT ("order_id", "event_type") DO NOTHING;

  RETURN 'PAID';
END;
$$;

CREATE OR REPLACE FUNCTION confirm_order_payment(
  p_order_id text,
  p_amount numeric,
  p_currency text,
  p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order "orders"%ROWTYPE;
BEGIN
  SELECT *
  INTO v_order
  FROM "orders"
  WHERE "id" = p_order_id
  FOR UPDATE;

  IF v_order."id" IS NULL THEN
    RETURN 'ORDER_NOT_FOUND';
  END IF;

  IF upper(p_currency) <> 'USD'
    OR abs(COALESCE(v_order."total_amount", 0) - p_amount) > 0.01 THEN
    RETURN 'REVIEW_AMOUNT_MISMATCH';
  END IF;

  IF v_order."status" = 'CANCELLED' THEN
    RETURN 'REVIEW_CANCELLED';
  END IF;

  IF v_order."status" = 'PAID' THEN
    RETURN 'ALREADY_PAID';
  END IF;

  IF v_order."status" = 'SHIPPED' THEN
    RETURN 'ALREADY_SHIPPED';
  END IF;

  IF v_order."status" <> 'PENDING_PAYMENT' THEN
    RETURN 'REVIEW_INVALID_ORDER_STATE';
  END IF;

  UPDATE "orders"
  SET
    "status" = 'PAID',
    "paid_at" = COALESCE("paid_at", now()),
    "updated_at" = now()
  WHERE "id" = p_order_id
    AND "status" = 'PENDING_PAYMENT';

  IF NOT FOUND THEN
    RETURN 'NO_TRANSITION';
  END IF;

  INSERT INTO "email_outbox" (
    "id",
    "order_id",
    "event_type",
    "payload",
    "status",
    "next_attempt_at",
    "created_at",
    "updated_at"
  )
  VALUES (
    'payment-confirmed:' || p_order_id,
    p_order_id,
    'PAYMENT_CONFIRMED',
    COALESCE(p_payload, '{}'::jsonb),
    'PENDING',
    now(),
    now(),
    now()
  )
  ON CONFLICT ("order_id", "event_type") DO NOTHING;

  RETURN 'PAID';
END;
$$;

CREATE OR REPLACE FUNCTION transition_order_status_with_inventory(
  p_order_id text,
  p_status varchar,
  p_notes text,
  p_tracking_number text,
  p_tracking_carrier varchar
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order "orders"%ROWTYPE;
  v_item jsonb;
  v_quantity integer;
  v_product_slug text;
BEGIN
  SELECT *
  INTO v_order
  FROM "orders"
  WHERE "id" = p_order_id
  FOR UPDATE;

  IF v_order."id" IS NULL THEN
    RETURN 'ORDER_NOT_FOUND';
  END IF;

  IF v_order."status" = 'SHIPPED' AND p_status <> 'SHIPPED' THEN
    RETURN 'SHIPPED_ORDER_IMMUTABLE';
  END IF;

  IF v_order."status" = 'PAID' AND p_status IN ('PENDING_PAYMENT', 'CANCELLED') THEN
    RETURN 'PAID_ORDER_REQUIRES_REFUND_WORKFLOW';
  END IF;

  IF p_status = 'SHIPPED' AND v_order."status" NOT IN ('PAID', 'SHIPPED') THEN
    RETURN 'PAYMENT_REQUIRED_BEFORE_SHIPPING';
  END IF;

  IF p_status = 'CANCELLED'
    AND v_order."status" = 'PENDING_PAYMENT'
    AND v_order."inventory_reservation_status" = 'RESERVED' THEN
    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(v_order."items")
      ORDER BY value->>'productSlug', value->>'variantLabel'
    LOOP
      v_product_slug := NULLIF(v_item->>'productSlug', '');
      v_quantity :=
        COALESCE((v_item->>'tierQuantity')::integer, 0)
        * GREATEST(COALESCE((v_item->>'count')::integer, 1), 1);

      IF v_product_slug IS NULL OR v_quantity <= 0 THEN
        RAISE EXCEPTION 'INVALID_RESERVED_INVENTORY_ITEM';
      END IF;

      UPDATE "product_inventory"
      SET
        "stock" = "stock" + v_quantity,
        "updated_at" = now()
      WHERE "product_slug" = v_product_slug
        AND "variant_label" = v_item->>'variantLabel';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'INVENTORY_RECORD_NOT_FOUND:%:%',
          v_product_slug,
          v_item->>'variantLabel';
      END IF;
    END LOOP;

    UPDATE "orders"
    SET
      "inventory_reservation_status" = 'RELEASED',
      "inventory_released_at" = now()
    WHERE "id" = p_order_id
      AND "inventory_reservation_status" = 'RESERVED';
  END IF;

  IF v_order."status" = 'CANCELLED'
    AND p_status <> 'CANCELLED'
    AND v_order."inventory_reservation_status" = 'RELEASED' THEN
    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(v_order."items")
      ORDER BY value->>'productSlug', value->>'variantLabel'
    LOOP
      v_product_slug := NULLIF(v_item->>'productSlug', '');
      v_quantity :=
        COALESCE((v_item->>'tierQuantity')::integer, 0)
        * GREATEST(COALESCE((v_item->>'count')::integer, 1), 1);

      UPDATE "product_inventory"
      SET
        "stock" = "stock" - v_quantity,
        "updated_at" = now()
      WHERE "product_slug" = v_product_slug
        AND "variant_label" = v_item->>'variantLabel'
        AND "stock" >= v_quantity;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_INVENTORY:%:%',
          v_product_slug,
          v_item->>'variantLabel';
      END IF;
    END LOOP;

    UPDATE "orders"
    SET
      "inventory_reservation_status" = 'RESERVED',
      "inventory_released_at" = NULL
    WHERE "id" = p_order_id
      AND "inventory_reservation_status" = 'RELEASED';
  END IF;

  UPDATE "orders"
  SET
    "status" = p_status,
    "notes" = NULLIF(p_notes, ''),
    "tracking_number" = NULLIF(p_tracking_number, ''),
    "tracking_carrier" = NULLIF(p_tracking_carrier, ''),
    "paid_at" = CASE
      WHEN p_status = 'PAID' THEN COALESCE("paid_at", now())
      ELSE "paid_at"
    END,
    "updated_at" = now()
  WHERE "id" = p_order_id;

  IF p_status = 'PAID' AND v_order."status" = 'PENDING_PAYMENT' THEN
    INSERT INTO "email_outbox" (
      "id",
      "order_id",
      "event_type",
      "payload",
      "status",
      "next_attempt_at",
      "created_at",
      "updated_at"
    )
    VALUES (
      'payment-confirmed:' || p_order_id,
      p_order_id,
      'PAYMENT_CONFIRMED',
      jsonb_build_object(
        'provider', 'Manual admin confirmation',
        'amountPaid', v_order."total_amount",
        'currency', 'USD'
      ),
      'PENDING',
      now(),
      now(),
      now()
    )
    ON CONFLICT ("order_id", "event_type") DO NOTHING;
  END IF;

  RETURN 'UPDATED';
END;
$$;

CREATE OR REPLACE FUNCTION record_manual_usdc_refund(
  p_id text,
  p_order_id text,
  p_attempt_id text,
  p_approved_by_user_id text,
  p_recipient_address text,
  p_amount numeric,
  p_status varchar,
  p_transaction_hash text,
  p_notes text
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_total numeric;
  v_payment_amount numeric;
  v_refunded_total numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id, 0));

  SELECT "total_amount"
  INTO v_order_total
  FROM "orders"
  WHERE "id" = p_order_id
    AND "status" IN ('PAID', 'SHIPPED', 'CANCELLED')
  FOR UPDATE;

  IF v_order_total IS NULL THEN
    RETURN 'ORDER_NOT_REFUNDABLE';
  END IF;

  SELECT COALESCE("filled_amount", "invoice_amount")
  INTO v_payment_amount
  FROM "payment_attempts"
  WHERE "id" = p_attempt_id
    AND "order_id" = p_order_id
    AND "provider" = 'payram'
    AND (
      "status" = 'FILLED'
      OR "provider_status" IN ('FILLED', 'OVER_FILLED')
    )
  FOR UPDATE;

  IF v_payment_amount IS NULL THEN
    RETURN 'PAYMENT_ATTEMPT_NOT_REFUNDABLE';
  END IF;

  SELECT COALESCE(sum("amount"), 0)
  INTO v_refunded_total
  FROM "payment_refunds"
  WHERE "order_id" = p_order_id
    AND "status" <> 'CANCELLED';

  IF p_amount <= 0 OR v_refunded_total + p_amount > v_payment_amount THEN
    RETURN 'REFUND_AMOUNT_EXCEEDS_PAYMENT';
  END IF;

  INSERT INTO "payment_refunds" (
    "id",
    "order_id",
    "payment_attempt_id",
    "approved_by_user_id",
    "recipient_address",
    "recipient_verified_at",
    "amount",
    "asset",
    "network",
    "status",
    "transaction_hash",
    "notes",
    "sent_at",
    "created_at",
    "updated_at"
  )
  VALUES (
    p_id,
    p_order_id,
    p_attempt_id,
    p_approved_by_user_id,
    p_recipient_address,
    now(),
    p_amount,
    'USDC',
    'BASE',
    p_status,
    NULLIF(p_transaction_hash, ''),
    NULLIF(p_notes, ''),
    CASE WHEN p_status = 'SENT' THEN now() ELSE NULL END,
    now(),
    now()
  );

  RETURN 'RECORDED';
END;
$$;

CREATE OR REPLACE FUNCTION record_payram_treasury_sweep(
  p_id text,
  p_attempt_id text,
  p_deposit_transaction_hash text,
  p_sweep_transaction_hash text,
  p_destination_address text,
  p_amount numeric
)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "payment_attempts"
    WHERE "id" = p_attempt_id
      AND "provider" = 'payram'
      AND (
        "status" = 'FILLED'
        OR "provider_status" IN ('FILLED', 'OVER_FILLED')
      )
      AND "deposit_transaction_hashes" ? lower(p_deposit_transaction_hash)
  ) THEN
    RETURN 'DEPOSIT_NOT_CONFIRMED';
  END IF;

  INSERT INTO "treasury_sweeps" (
    "id",
    "payment_attempt_id",
    "deposit_transaction_hash",
    "sweep_transaction_hash",
    "destination_address",
    "amount",
    "asset",
    "network",
    "status",
    "confirmed_at",
    "created_at",
    "updated_at"
  )
  VALUES (
    p_id,
    p_attempt_id,
    lower(p_deposit_transaction_hash),
    lower(p_sweep_transaction_hash),
    lower(p_destination_address),
    p_amount,
    'USDC',
    'BASE',
    'CONFIRMED',
    now(),
    now(),
    now()
  );

  RETURN 'RECORDED';
END;
$$;
