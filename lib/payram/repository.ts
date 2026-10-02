import "server-only";

import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";

import type { Order } from "@/lib/orders";
import { db, getOrderById } from "@/lib/db";
import {
  emailOutbox,
  paymentAttempts,
  paymentEvents,
  paymentRefunds,
  treasurySweeps,
  sqlClient,
} from "@/lib/db/index";
import type {
  PayRamAttemptStatus,
  PayRamProviderStatus,
} from "./constants";
import type {
  PayRamVerificationDecision,
  PayRamWebhookPayload,
} from "./verification";

export type InventoryReservationInput = {
  productSlug: string;
  variantLabel: string;
  quantity: number;
};

export type NewPayRamAttemptInput = {
  id: string;
  invoiceId: string;
  invoiceAmount: string;
  tokenAddress: string;
  expiresAt: Date;
};

export type AtomicOrderInput = {
  order: Order;
  paymentMethod: string;
  idempotencyKey: string;
  guestAccessTokenHash: string;
  inventoryItems: InventoryReservationInput[];
  attempt?: NewPayRamAttemptInput;
};

export type AtomicOrderResult = {
  order: Order;
  created: boolean;
};

export type PaymentAttemptRecord = {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  invoiceId: string;
  invoiceAmount: string;
  settlementAsset: string;
  settlementNetwork: string;
  tokenAddress: string | null;
  status: PayRamAttemptStatus;
  providerStatus: PayRamProviderStatus | null;
  paymentUrl: string | null;
  receivingAddress: string | null;
  filledAmount: string | null;
  filledAmountUsd: string | null;
  depositTransactionHashes: string[];
  confirmationCurrent: number;
  confirmationRequired: number;
  reviewReason: string | null;
  reconciliationError: string | null;
  expiresAt: Date | null;
  lastProviderEventAt: Date | null;
  lastReconciledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaymentEmailPayload = {
  provider: string;
  paymentId: string;
  amountPaid: number;
  currency: string;
};

function toPaymentAttempt(
  row: typeof paymentAttempts.$inferSelect
): PaymentAttemptRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    providerReference: row.providerReference,
    invoiceId: row.invoiceId,
    invoiceAmount: row.invoiceAmount,
    settlementAsset: row.settlementAsset,
    settlementNetwork: row.settlementNetwork,
    tokenAddress: row.tokenAddress,
    status: row.status as PayRamAttemptStatus,
    providerStatus: row.providerStatus as PayRamProviderStatus | null,
    paymentUrl: row.paymentUrl,
    receivingAddress: row.receivingAddress,
    filledAmount: row.filledAmount,
    filledAmountUsd: row.filledAmountUsd,
    depositTransactionHashes: row.depositTransactionHashes,
    confirmationCurrent: row.confirmationCurrent,
    confirmationRequired: row.confirmationRequired,
    reviewReason: row.reviewReason,
    reconciliationError: row.reconciliationError,
    expiresAt: row.expiresAt,
    lastProviderEventAt: row.lastProviderEventAt,
    lastReconciledAt: row.lastReconciledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 500);
}

export async function createOrderWithInventoryReservation(
  input: AtomicOrderInput
): Promise<AtomicOrderResult> {
  const payload = {
    id: input.order.id,
    orderNumber: input.order.orderNumber,
    userId: input.order.userId ?? "",
    paymentMethod: input.paymentMethod,
    idempotencyKey: input.idempotencyKey,
    guestAccessTokenHash: input.guestAccessTokenHash,
    customerName: input.order.customerName,
    customerEmail: input.order.customerEmail,
    customerPhone: input.order.customerPhone,
    shippingAddress: input.order.shippingAddress,
    items: input.order.items,
    subtotal: input.order.subtotal.toFixed(2),
    shippingCost: (input.order.shippingCost ?? 0).toFixed(2),
    totalAmount: (input.order.totalAmount ?? input.order.subtotal).toFixed(2),
    totalUnits: input.order.totalUnits,
    referralPartnerId: input.order.referralPartnerId ?? "",
    referralPartnerName: input.order.referralPartnerName ?? "",
    referralCodeId: input.order.referralCodeId ?? "",
    referralCodeValue: input.order.referralCode ?? "",
    referralAttributionId: input.order.referralAttributionId ?? "",
    referralDiscount: (input.order.referralDiscount ?? 0).toFixed(2),
    referralCommissionPercent: (
      input.order.referralCommissionPercent ?? 0
    ).toFixed(2),
    referralCommissionAmount: (
      input.order.referralCommissionAmount ?? 0
    ).toFixed(2),
  };
  const attempt = input.attempt
    ? {
      id: input.attempt.id,
      invoiceId: input.attempt.invoiceId,
      invoiceAmount: input.attempt.invoiceAmount,
      tokenAddress: input.attempt.tokenAddress,
      expiresAt: input.attempt.expiresAt.toISOString(),
    }
    : null;

  const rows = await sqlClient`
    SELECT *
    FROM create_order_with_inventory_reservation(
      ${JSON.stringify(payload)}::jsonb,
      ${JSON.stringify(input.inventoryItems)}::jsonb,
      ${attempt ? JSON.stringify(attempt) : null}::jsonb
    )
  `;
  const result = rows[0] as
    | { order_id?: unknown; created?: unknown }
    | undefined;
  const orderId =
    typeof result?.order_id === "string" ? result.order_id : input.order.id;
  const order = await getOrderById(orderId);

  if (!order) {
    throw new Error("Atomic order creation completed without returning an order.");
  }

  return {
    order,
    created: result?.created === true,
  };
}

export async function getPaymentAttemptById(
  attemptId: string
): Promise<PaymentAttemptRecord | null> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.id, attemptId))
    .limit(1);
  return row ? toPaymentAttempt(row) : null;
}

export async function getLatestPaymentAttemptForOrder(
  orderId: string
): Promise<PaymentAttemptRecord | null> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.orderId, orderId),
        eq(paymentAttempts.provider, "payram")
      )
    )
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(1);
  return row ? toPaymentAttempt(row) : null;
}

export async function getPaymentAttemptByReference(
  referenceId: string
): Promise<PaymentAttemptRecord | null> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.provider, "payram"),
        eq(paymentAttempts.providerReference, referenceId)
      )
    )
    .limit(1);
  return row ? toPaymentAttempt(row) : null;
}

export async function getPaymentAttemptByInvoice(
  invoiceId: string
): Promise<PaymentAttemptRecord | null> {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.provider, "payram"),
        eq(paymentAttempts.invoiceId, invoiceId)
      )
    )
    .limit(1);
  return row ? toPaymentAttempt(row) : null;
}

export async function attachPayRamReference(
  attemptId: string,
  referenceId: string
): Promise<PaymentAttemptRecord> {
  const [row] = await db
    .update(paymentAttempts)
    .set({
      providerReference: referenceId,
      reconciliationError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentAttempts.id, attemptId),
        eq(paymentAttempts.provider, "payram"),
        or(
          isNull(paymentAttempts.providerReference),
          eq(paymentAttempts.providerReference, referenceId)
        )
      )
    )
    .returning();
  if (!row) {
    throw new Error("PayRam payment attempt was not found.");
  }
  return toPaymentAttempt(row);
}

export async function markPayRamAttemptReady(
  attemptId: string,
  result: { referenceId: string; paymentUrl: string }
): Promise<PaymentAttemptRecord> {
  const [row] = await db
    .update(paymentAttempts)
    .set({
      providerReference: result.referenceId,
      paymentUrl: result.paymentUrl,
      status: "OPEN",
      providerStatus: "OPEN",
      reconciliationError: null,
      updatedAt: new Date(),
    })
    .where(eq(paymentAttempts.id, attemptId))
    .returning();

  if (!row) {
    throw new Error("Payment attempt disappeared while saving PayRam checkout.");
  }
  return toPaymentAttempt(row);
}

export async function markPayRamAttemptCreationError(
  attemptId: string,
  error: unknown,
  ambiguous: boolean
): Promise<void> {
  await db
    .update(paymentAttempts)
    .set({
      status: ambiguous ? "RECONCILIATION_REQUIRED" : "FAILED",
      reconciliationError: safeErrorMessage(error),
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentAttempts.id, attemptId));
}

export async function recordPayRamReconciliationError(
  attemptId: string,
  error: unknown
): Promise<void> {
  await db
    .update(paymentAttempts)
    .set({
      reconciliationError: safeErrorMessage(error),
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentAttempts.id, attemptId));
}

export async function createRetryPaymentAttempt(input: {
  id: string;
  orderId: string;
  invoiceAmount: string;
  tokenAddress: string;
  expiresAt: Date;
}): Promise<{ attempt: PaymentAttemptRecord; created: boolean }> {
  const rows = await sqlClient`
    WITH existing AS (
      SELECT "id"
      FROM "payment_attempts"
      WHERE "order_id" = ${input.orderId}
        AND "provider" = 'payram'
        AND "status" IN (
          'CREATING',
          'OPEN',
          'CONFIRMING',
          'PARTIALLY_FILLED',
          'RECONCILIATION_REQUIRED'
        )
      ORDER BY "created_at" DESC
      LIMIT 1
    ),
    inserted AS (
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
      SELECT
        ${input.id},
        ${input.orderId},
        'payram',
        ${input.id},
        ${input.invoiceAmount}::numeric,
        'USDC',
        'BASE',
        ${input.tokenAddress},
        'CREATING',
        ${input.expiresAt.toISOString()}::timestamp,
        now(),
        now()
      WHERE NOT EXISTS (SELECT 1 FROM existing)
        AND EXISTS (
          SELECT 1
          FROM "orders"
          WHERE "id" = ${input.orderId}
            AND "status" = 'PENDING_PAYMENT'
        )
      ON CONFLICT DO NOTHING
      RETURNING "id"
    )
    SELECT "id", true AS "created" FROM inserted
    UNION ALL
    SELECT "id", false AS "created" FROM existing
    LIMIT 1
  `;
  const result = rows[0] as { id?: unknown; created?: unknown } | undefined;
  if (!result || typeof result.id !== "string") {
    const racedAttempt = await getLatestPaymentAttemptForOrder(input.orderId);
    if (
      racedAttempt &&
      [
        "CREATING",
        "OPEN",
        "CONFIRMING",
        "PARTIALLY_FILLED",
        "RECONCILIATION_REQUIRED",
      ].includes(racedAttempt.status)
    ) {
      return { attempt: racedAttempt, created: false };
    }
    throw new Error("No eligible PayRam payment attempt can be resumed.");
  }
  const attempt = await getPaymentAttemptById(result.id);
  if (!attempt) {
    throw new Error("Resumed PayRam payment attempt could not be loaded.");
  }
  return { attempt, created: result.created === true };
}

export async function persistPayRamEvent(input: {
  rawBodyHash: string;
  payload: PayRamWebhookPayload;
  attemptId?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const id = randomUUID();
  const providerTimestamp =
    input.payload.timestamp && input.payload.timestamp > 0
      ? new Date(input.payload.timestamp * 1000)
      : null;
  const [inserted] = await db
    .insert(paymentEvents)
    .values({
      id,
      provider: "payram",
      paymentAttemptId: input.attemptId ?? null,
      providerReference: input.payload.referenceId,
      invoiceId: input.payload.invoiceId,
      providerStatus: input.payload.status,
      rawBodyHash: input.rawBodyHash,
      payload: input.payload.raw,
      providerTimestamp,
    })
    .onConflictDoNothing()
    .returning({ id: paymentEvents.id });

  if (!inserted) {
    const [existing] = await db
      .select({ id: paymentEvents.id })
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.provider, "payram"),
          eq(paymentEvents.rawBodyHash, input.rawBodyHash)
        )
      )
      .limit(1);
    return {
      id: existing?.id ?? id,
      created: false,
    };
  }

  return {
    id: inserted.id,
    created: true,
  };
}

export async function finishPayRamEvent(
  eventId: string,
  result: { success: true; result: string } | { success: false; error: unknown }
): Promise<void> {
  await db
    .update(paymentEvents)
    .set({
      processingStatus: result.success ? "PROCESSED" : "FAILED",
      processingResult: result.success ? result.result : null,
      processingError: result.success ? null : safeErrorMessage(result.error),
      processedAt: new Date(),
    })
    .where(eq(paymentEvents.id, eventId));
}

export async function applyPayRamVerificationDecision(
  attempt: PaymentAttemptRecord,
  decision: PayRamVerificationDecision
): Promise<string> {
  const emailPayload: PaymentEmailPayload = {
    provider: "PayRam card-to-crypto",
    paymentId:
      decision.transactionHashes[0] ??
      attempt.providerReference ??
      attempt.id,
    amountPaid: Number(attempt.invoiceAmount),
    currency: attempt.settlementAsset,
  };
  const update = {
    providerStatus: decision.providerStatus,
    attemptStatus: decision.attemptStatus,
    shouldPay: decision.shouldPay,
    reviewReason: decision.reviewReason ?? "",
    reconciliationError: "",
    tokenAddress: decision.tokenAddress ?? "",
    receivingAddress: decision.receivingAddress ?? "",
    filledAmount: decision.filledAmount ?? "",
    filledAmountUsd: decision.filledAmountUsd ?? "",
    depositTransactionHashes: decision.transactionHashes,
    confirmationCurrent: decision.confirmationCurrent,
    confirmationRequired: decision.confirmationRequired,
    providerTimestamp: decision.providerTimestamp?.toISOString() ?? "",
    emailPayload,
  };
  const rows = await sqlClient`
    SELECT apply_payram_payment_update(
      ${attempt.id},
      ${JSON.stringify(update)}::jsonb
    ) AS "result"
  `;
  const result = (rows[0] as { result?: unknown } | undefined)?.result;
  return typeof result === "string" ? result : decision.attemptStatus;
}

export async function getOutstandingPayRamAttempts(
  limit = 100
): Promise<PaymentAttemptRecord[]> {
  const rows = await db
    .select()
    .from(paymentAttempts)
    .where(
      and(
        eq(paymentAttempts.provider, "payram"),
        or(
          eq(paymentAttempts.status, "OPEN"),
          eq(paymentAttempts.status, "CONFIRMING"),
          eq(paymentAttempts.status, "PARTIALLY_FILLED"),
          eq(paymentAttempts.status, "RECONCILIATION_REQUIRED")
        )
      )
    )
    .orderBy(asc(paymentAttempts.updatedAt))
    .limit(Math.max(1, Math.min(limit, 250)));
  return rows.map(toPaymentAttempt);
}

export async function markStaleCreatingAttemptsForReconciliation(): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * 60 * 1000);
  const rows = await db
    .update(paymentAttempts)
    .set({
      status: "RECONCILIATION_REQUIRED",
      reconciliationError:
        "Payment creation did not finish; reconcile by invoice before retrying.",
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentAttempts.provider, "payram"),
        eq(paymentAttempts.status, "CREATING"),
        lt(paymentAttempts.updatedAt, cutoff)
      )
    )
    .returning({ id: paymentAttempts.id });
  return rows.length;
}

export async function confirmLegacyOrderPayment(input: {
  orderId: string;
  amount: number;
  currency: string;
  payload: PaymentEmailPayload;
}): Promise<string> {
  const rows = await sqlClient`
    SELECT confirm_order_payment(
      ${input.orderId},
      ${input.amount.toFixed(2)}::numeric,
      ${input.currency},
      ${JSON.stringify(input.payload)}::jsonb
    ) AS "result"
  `;
  const result = (rows[0] as { result?: unknown } | undefined)?.result;
  return typeof result === "string" ? result : "NO_TRANSITION";
}

export async function transitionOrderStatusAtomically(input: {
  orderId: string;
  status: string;
  notes?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
}): Promise<string> {
  const rows = await sqlClient`
    SELECT transition_order_status_with_inventory(
      ${input.orderId},
      ${input.status}::varchar,
      ${input.notes ?? null},
      ${input.trackingNumber ?? null},
      ${input.trackingCarrier ?? null}::varchar
    ) AS "result"
  `;
  const result = (rows[0] as { result?: unknown } | undefined)?.result;
  return typeof result === "string" ? result : "ORDER_NOT_FOUND";
}

export type EmailOutboxRecord = {
  id: string;
  orderId: string;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
};

export async function claimEmailOutbox(
  limit = 10
): Promise<EmailOutboxRecord[]> {
  const rows = await sqlClient`
    WITH candidates AS (
      SELECT "id"
      FROM "email_outbox"
      WHERE (
          ("status" IN ('PENDING', 'FAILED') AND "next_attempt_at" <= now())
          OR ("status" = 'PROCESSING' AND "locked_until" < now())
        )
        AND ("locked_until" IS NULL OR "locked_until" < now())
      ORDER BY "created_at"
      FOR UPDATE SKIP LOCKED
      LIMIT ${Math.max(1, Math.min(limit, 50))}
    )
    UPDATE "email_outbox" AS outbox
    SET
      "status" = 'PROCESSING',
      "attempts" = outbox."attempts" + 1,
      "locked_until" = now() + interval '5 minutes',
      "updated_at" = now()
    FROM candidates
    WHERE outbox."id" = candidates."id"
    RETURNING
      outbox."id",
      outbox."order_id",
      outbox."event_type",
      outbox."payload",
      outbox."attempts"
  `;

  return rows.flatMap((row) => {
    const candidate = row as Record<string, unknown>;
    return typeof candidate.id === "string" &&
      typeof candidate.order_id === "string" &&
      typeof candidate.event_type === "string" &&
      candidate.payload &&
      typeof candidate.payload === "object"
      ? [
        {
          id: candidate.id,
          orderId: candidate.order_id,
          eventType: candidate.event_type,
          payload: candidate.payload as Record<string, unknown>,
          attempts:
            typeof candidate.attempts === "number" ? candidate.attempts : 1,
        },
      ]
      : [];
  });
}

export async function completeEmailOutbox(id: string): Promise<void> {
  await db
    .update(emailOutbox)
    .set({
      status: "SENT",
      sentAt: new Date(),
      lockedUntil: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(emailOutbox.id, id));
}

export async function failEmailOutbox(
  id: string,
  attempts: number,
  error: unknown
): Promise<void> {
  const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
  await db
    .update(emailOutbox)
    .set({
      status: "FAILED",
      lockedUntil: null,
      lastError: safeErrorMessage(error),
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(emailOutbox.id, id));
}

export async function getPaymentAttemptsForOrders(
  orderIds: string[]
): Promise<Map<string, PaymentAttemptRecord[]>> {
  const result = new Map<string, PaymentAttemptRecord[]>();
  if (orderIds.length === 0) {
    return result;
  }
  const rows = await db
    .select()
    .from(paymentAttempts)
    .where(inArray(paymentAttempts.orderId, orderIds))
    .orderBy(desc(paymentAttempts.createdAt));
  for (const row of rows) {
    const attempt = toPaymentAttempt(row);
    const entries = result.get(attempt.orderId) ?? [];
    entries.push(attempt);
    result.set(attempt.orderId, entries);
  }
  return result;
}

export type RefundRecord = typeof paymentRefunds.$inferSelect;
export type TreasurySweepRecord = typeof treasurySweeps.$inferSelect;

export async function getRefundsForOrders(
  orderIds: string[]
): Promise<Map<string, RefundRecord[]>> {
  const result = new Map<string, RefundRecord[]>();
  if (orderIds.length === 0) {
    return result;
  }
  const rows = await db
    .select()
    .from(paymentRefunds)
    .where(inArray(paymentRefunds.orderId, orderIds))
    .orderBy(desc(paymentRefunds.createdAt));
  for (const row of rows) {
    const entries = result.get(row.orderId) ?? [];
    entries.push(row);
    result.set(row.orderId, entries);
  }
  return result;
}

export async function getSweepsForAttempts(
  attemptIds: string[]
): Promise<Map<string, TreasurySweepRecord[]>> {
  const result = new Map<string, TreasurySweepRecord[]>();
  if (attemptIds.length === 0) {
    return result;
  }
  const rows = await db
    .select()
    .from(treasurySweeps)
    .where(inArray(treasurySweeps.paymentAttemptId, attemptIds))
    .orderBy(desc(treasurySweeps.createdAt));
  for (const row of rows) {
    const entries = result.get(row.paymentAttemptId) ?? [];
    entries.push(row);
    result.set(row.paymentAttemptId, entries);
  }
  return result;
}

export async function recordManualUsdcRefund(input: {
  id: string;
  orderId: string;
  attemptId: string;
  approvedByUserId: string;
  recipientAddress: string;
  amount: string;
  transactionHash?: string;
  notes?: string;
}): Promise<string> {
  const status = input.transactionHash ? "SENT" : "APPROVED";
  const rows = await sqlClient`
    SELECT record_manual_usdc_refund(
      ${input.id},
      ${input.orderId},
      ${input.attemptId},
      ${input.approvedByUserId},
      ${input.recipientAddress.toLowerCase()},
      ${input.amount}::numeric,
      ${status}::varchar,
      ${input.transactionHash?.toLowerCase() ?? null},
      ${input.notes ?? null}
    ) AS "result"
  `;
  const result = (rows[0] as { result?: unknown } | undefined)?.result;
  return typeof result === "string" ? result : "NOT_RECORDED";
}

export async function recordPayRamTreasurySweep(input: {
  id: string;
  attemptId: string;
  depositTransactionHash: string;
  sweepTransactionHash: string;
  destinationAddress: string;
  amount: string;
}): Promise<string> {
  const rows = await sqlClient`
    SELECT record_payram_treasury_sweep(
      ${input.id},
      ${input.attemptId},
      ${input.depositTransactionHash.toLowerCase()},
      ${input.sweepTransactionHash.toLowerCase()},
      ${input.destinationAddress.toLowerCase()},
      ${input.amount}::numeric
    ) AS "result"
  `;
  const result = (rows[0] as { result?: unknown } | undefined)?.result;
  return typeof result === "string" ? result : "NOT_RECORDED";
}

export async function resolveUnreferencedAttemptAsFailed(
  attemptId: string
): Promise<boolean> {
  const [updated] = await db
    .update(paymentAttempts)
    .set({
      status: "FAILED",
      reconciliationError:
        "Admin confirmed in PayRam that no provider payment was created.",
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(paymentAttempts.id, attemptId),
        eq(paymentAttempts.provider, "payram"),
        eq(paymentAttempts.status, "RECONCILIATION_REQUIRED"),
        isNull(paymentAttempts.providerReference)
      )
    )
    .returning({ id: paymentAttempts.id });
  return Boolean(updated);
}
