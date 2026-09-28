import "server-only";

import { randomUUID } from "node:crypto";

import { getOrderById } from "@/lib/db";
import type { Order } from "@/lib/orders";
import {
  createPayRamPayment,
  getPayRamPaymentStatus,
  PayRamApiError,
} from "./client";
import {
  getPayRamConfig,
  getPayRamOperationalConfig,
  isPayRamCheckoutEnabled,
} from "./config";
import type { PayRamWebhookPayload } from "./verification";
import { verifyPayRamPayment } from "./verification";
import {
  applyPayRamVerificationDecision,
  attachPayRamReference,
  createRetryPaymentAttempt,
  getLatestPaymentAttemptForOrder,
  getOutstandingPayRamAttempts,
  getPaymentAttemptByInvoice,
  getPaymentAttemptByReference,
  getPaymentAttemptById,
  markPayRamAttemptCreationError,
  markPayRamAttemptReady,
  markStaleCreatingAttemptsForReconciliation,
  recordPayRamReconciliationError,
  type PaymentAttemptRecord,
} from "./repository";

const PAYMENT_LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type PaymentInitializationResult = {
  attempt: PaymentAttemptRecord;
  paymentUrl: string | null;
  requiresReconciliation: boolean;
};

export async function initializePayRamAttempt(input: {
  order: Order;
  attemptId: string;
}): Promise<PaymentInitializationResult> {
  let attempt = await getPaymentAttemptById(input.attemptId);
  if (!attempt) {
    throw new Error("PayRam payment attempt was not created with the order.");
  }

  try {
    const result = await createPayRamPayment({
      attemptId: attempt.id,
      customerEmail: input.order.customerEmail,
      customerId: input.order.id,
      amountInUsd: attempt.invoiceAmount,
      expiresAt: attempt.expiresAt ?? new Date(Date.now() + PAYMENT_LINK_LIFETIME_MS),
    });
    attempt = await markPayRamAttemptReady(attempt.id, result);
    return {
      attempt,
      paymentUrl: attempt.paymentUrl,
      requiresReconciliation: false,
    };
  } catch (error) {
    const ambiguous =
      error instanceof PayRamApiError ? error.ambiguous : true;
    await markPayRamAttemptCreationError(attempt.id, error, ambiguous);
    attempt = (await getPaymentAttemptById(attempt.id)) ?? attempt;

    return {
      attempt,
      paymentUrl: null,
      requiresReconciliation: ambiguous,
    };
  }
}

export async function resolvePayRamWebhookAttempt(
  payload: PayRamWebhookPayload
): Promise<PaymentAttemptRecord | null> {
  const byReference = await getPaymentAttemptByReference(payload.referenceId);
  if (byReference) {
    if (payload.invoiceId && payload.invoiceId !== byReference.invoiceId) {
      throw new Error("PayRam webhook invoice does not match its reference.");
    }
    return byReference;
  }

  if (!payload.invoiceId) {
    return null;
  }

  const byInvoice = await getPaymentAttemptByInvoice(payload.invoiceId);
  if (!byInvoice) {
    return null;
  }
  if (
    byInvoice.providerReference &&
    byInvoice.providerReference !== payload.referenceId
  ) {
    throw new Error("PayRam webhook reference conflicts with stored invoice.");
  }

  return attachPayRamReference(byInvoice.id, payload.referenceId);
}

export async function reconcilePayRamAttempt(
  attempt: PaymentAttemptRecord,
  webhook?: PayRamWebhookPayload | null
): Promise<string> {
  if (!attempt.providerReference) {
    throw new Error(
      "PayRam attempt has no provider reference and requires invoice reconciliation."
    );
  }

  try {
    const order = await getOrderById(attempt.orderId);
    if (!order) {
      throw new Error("PayRam attempt references a missing order.");
    }

    const status = await getPayRamPaymentStatus(attempt.providerReference);
    const config = getPayRamOperationalConfig();
    const decision = verifyPayRamPayment({
      attemptId: attempt.invoiceId,
      orderId: order.id,
      providerReference: attempt.providerReference,
      invoiceAmount: attempt.invoiceAmount,
      settlementAsset: attempt.settlementAsset,
      settlementNetwork: attempt.settlementNetwork,
      expectedTokenAddress: config.tokenAddress,
      status,
      webhook,
    });

    return await applyPayRamVerificationDecision(attempt, decision);
  } catch (error) {
    await recordPayRamReconciliationError(attempt.id, error);
    throw error;
  }
}

export async function resumePayRamAttempt(input: {
  order: Order;
}): Promise<PaymentInitializationResult> {
  const existing = await getLatestPaymentAttemptForOrder(input.order.id);

  if (
    existing &&
    existing.paymentUrl &&
    [
      "OPEN",
      "CONFIRMING",
      "PARTIALLY_FILLED",
      "RECONCILIATION_REQUIRED",
    ].includes(existing.status)
  ) {
    return {
      attempt: existing,
      paymentUrl: existing.paymentUrl,
      requiresReconciliation:
        existing.status === "RECONCILIATION_REQUIRED",
    };
  }

  if (
    existing &&
    ["CREATING", "RECONCILIATION_REQUIRED", "REVIEW_REQUIRED"].includes(
      existing.status
    )
  ) {
    return {
      attempt: existing,
      paymentUrl: existing.paymentUrl,
      requiresReconciliation:
        existing.status === "CREATING" ||
        existing.status === "RECONCILIATION_REQUIRED",
    };
  }

  if (
    existing &&
    ["FILLED", "OVER_FILLED"].includes(existing.status)
  ) {
    return {
      attempt: existing,
      paymentUrl: null,
      requiresReconciliation: false,
    };
  }

  if (!isPayRamCheckoutEnabled()) {
    throw new Error(
      "New card-to-crypto attempts are disabled while existing payments continue reconciling."
    );
  }
  if (input.order.status !== "PENDING_PAYMENT") {
    throw new Error("Only unpaid orders can start another PayRam attempt.");
  }

  const config = getPayRamConfig();
  const attemptId = randomUUID();
  const { attempt, created } = await createRetryPaymentAttempt({
    id: attemptId,
    orderId: input.order.id,
    invoiceAmount: (input.order.totalAmount ?? input.order.subtotal).toFixed(2),
    tokenAddress: config.tokenAddress,
    expiresAt: new Date(Date.now() + PAYMENT_LINK_LIFETIME_MS),
  });

  if (!created) {
    return {
      attempt,
      paymentUrl: attempt.paymentUrl,
      requiresReconciliation:
        attempt.status === "CREATING" ||
        attempt.status === "RECONCILIATION_REQUIRED",
    };
  }

  return initializePayRamAttempt({
    order: input.order,
    attemptId: attempt.id,
  });
}

export async function reconcileOutstandingPayRamAttempts(): Promise<{
  checked: number;
  updated: number;
  unresolved: number;
  staleCreating: number;
}> {
  const staleCreating = await markStaleCreatingAttemptsForReconciliation();
  const attempts = await getOutstandingPayRamAttempts();
  let updated = 0;
  let unresolved = 0;

  for (const attempt of attempts) {
    if (!attempt.providerReference) {
      unresolved += 1;
      continue;
    }

    try {
      await reconcilePayRamAttempt(attempt);
      updated += 1;
    } catch {
      unresolved += 1;
    }
  }

  return {
    checked: attempts.length,
    updated,
    unresolved,
    staleCreating,
  };
}
