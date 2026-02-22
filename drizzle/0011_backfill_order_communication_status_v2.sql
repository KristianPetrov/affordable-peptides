UPDATE "orders"
SET
  "order_receipt_email_status" = COALESCE("order_receipt_email_status", 'email.sent'),
  "order_receipt_email_updated_at" = COALESCE("order_receipt_email_updated_at", "created_at")
WHERE "status" IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED');

UPDATE "orders"
SET
  "order_paid_email_status" = COALESCE("order_paid_email_status", 'email.sent'),
  "order_paid_email_updated_at" = COALESCE("order_paid_email_updated_at", "updated_at")
WHERE "status" IN ('PAID', 'SHIPPED');

UPDATE "orders"
SET
  "order_shipped_email_status" = COALESCE("order_shipped_email_status", 'email.sent'),
  "order_shipped_email_updated_at" = COALESCE("order_shipped_email_updated_at", "updated_at")
WHERE "status" = 'SHIPPED';
