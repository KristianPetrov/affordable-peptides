import "server-only";

import { getOrderById } from "@/lib/db";
import {
  sendAdminPaymentReceivedEmail,
  sendOrderPaidEmail,
} from "@/lib/email";
import {
  claimEmailOutbox,
  completeEmailOutbox,
  failEmailOutbox,
} from "@/lib/payram/repository";

function payloadString(
  payload: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function payloadNumber(
  payload: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
}

export async function processEmailOutbox(limit = 10): Promise<{
  claimed: number;
  sent: number;
  failed: number;
}> {
  const records = await claimEmailOutbox(limit);
  let sent = 0;
  let failed = 0;

  for (const record of records) {
    try {
      if (record.eventType !== "PAYMENT_CONFIRMED") {
        throw new Error(`Unsupported outbox event: ${record.eventType}`);
      }

      const order = await getOrderById(record.orderId);
      if (!order) {
        throw new Error("Outbox order no longer exists.");
      }

      const amountFallback = order.totalAmount ?? order.subtotal;
      const provider = payloadString(
        record.payload,
        "provider",
        "Payment confirmation"
      );
      const paymentId = payloadString(
        record.payload,
        "paymentId",
        order.id
      );
      const currency = payloadString(record.payload, "currency", "USD");
      const amountPaid = payloadNumber(
        record.payload,
        "amountPaid",
        amountFallback
      );

      await Promise.all([
        sendOrderPaidEmail(order, {
          idempotencyKey: `payment-confirmed-customer/${order.id}`,
        }),
        sendAdminPaymentReceivedEmail(
          order,
          {
            provider,
            paymentId,
            amountPaid,
            currency,
          },
          {
            idempotencyKey: `payment-confirmed-admin/${order.id}`,
          }
        ),
      ]);

      await completeEmailOutbox(record.id);
      sent += 1;
    } catch (error) {
      await failEmailOutbox(record.id, record.attempts, error);
      failed += 1;
    }
  }

  return { claimed: records.length, sent, failed };
}
