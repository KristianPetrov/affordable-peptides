UPDATE "orders"
SET
  "order_receipt_email_status" = COALESCE(
    "order_receipt_email_status",
    CASE
      WHEN "status" IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED') THEN 'email.sent'
      ELSE NULL
    END
  ),
  "order_receipt_email_updated_at" = COALESCE(
    "order_receipt_email_updated_at",
    CASE
      WHEN "status" IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED') THEN "created_at"
      ELSE NULL
    END
  ),
  "order_paid_email_status" = COALESCE(
    "order_paid_email_status",
    CASE
      WHEN "status" IN ('PAID', 'SHIPPED') THEN 'email.sent'
      ELSE NULL
    END
  ),
  "order_paid_email_updated_at" = COALESCE(
    "order_paid_email_updated_at",
    CASE
      WHEN "status" IN ('PAID', 'SHIPPED') THEN "updated_at"
      ELSE NULL
    END
  ),
  "order_shipped_email_status" = COALESCE(
    "order_shipped_email_status",
    CASE
      WHEN "status" = 'SHIPPED' THEN 'email.sent'
      ELSE NULL
    END
  ),
  "order_shipped_email_updated_at" = COALESCE(
    "order_shipped_email_updated_at",
    CASE
      WHEN "status" = 'SHIPPED' THEN "updated_at"
      ELSE NULL
    END
  )
WHERE
  "status" IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED')
  AND (
    "order_receipt_email_status" IS NULL
    OR "order_paid_email_status" IS NULL
    OR "order_shipped_email_status" IS NULL
    OR "order_receipt_email_updated_at" IS NULL
    OR "order_paid_email_updated_at" IS NULL
    OR "order_shipped_email_updated_at" IS NULL
  );
