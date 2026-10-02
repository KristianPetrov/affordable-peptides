"use server";

import { randomUUID } from "node:crypto";
import { deleteOrder, getOrderById, setProductStock } from "@/lib/db";
import type { Order, OrderStatus } from "@/lib/orders";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getProductBySlug } from "@/lib/products";
import { sendOrderShippedEmail } from "@/lib/email";
import { processEmailOutbox } from "@/lib/email-outbox";
import {
  getPaymentAttemptById,
  getLatestPaymentAttemptForOrder,
  recordManualUsdcRefund,
  recordPayRamTreasurySweep,
  resolveUnreferencedAttemptAsFailed,
  transitionOrderStatusAtomically,
} from "@/lib/payram/repository";
import {
  isBaseAddress,
  isBaseTransactionHash,
} from "@/lib/payram/constants";
import { getPayRamOperationalConfig } from "@/lib/payram/config";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "SHIPPED",
  "CANCELLED",
];

const TRACKING_CARRIERS = ["UPS", "USPS"] as const;

export type OrderStatusFormState = {
  orderId: string;
  status: OrderStatus;
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: number;
  trackingNumber?: string;
  trackingCarrier?: (typeof TRACKING_CARRIERS)[number];
};

export async function updateOrderStatusAction (
  orderId: string,
  status: OrderStatus,
  notes?: string,
  trackingNumber?: string,
  trackingCarrier?: "UPS" | "USPS"
): Promise<{ success: boolean; error?: string; order?: Order }>
{
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!orderId || !status) {
      return { success: false, error: "Missing required fields" };
    }

    if (!ORDER_STATUSES.includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return { success: false, error: "Order not found" };
    }

    const previousStatus = existingOrder.status;
    const transition = await transitionOrderStatusAtomically({
      orderId,
      status,
      notes,
      trackingNumber,
      trackingCarrier,
    });
    const transitionErrors: Record<string, string> = {
      ORDER_NOT_FOUND: "Order not found",
      SHIPPED_ORDER_IMMUTABLE: "Shipped orders cannot be downgraded.",
      PAID_ORDER_REQUIRES_REFUND_WORKFLOW:
        "Paid orders cannot be cancelled or downgraded here. Record and complete the manual refund workflow first.",
      PAYMENT_REQUIRED_BEFORE_SHIPPING:
        "Payment must be confirmed before an order can be shipped.",
    };
    if (transition !== "UPDATED") {
      return {
        success: false,
        error: transitionErrors[transition] ?? "Order transition was rejected.",
      };
    }

    const updated = await getOrderById(orderId);
    if (!updated) {
      return { success: false, error: "Order not found" };
    }

    if (status === "PAID" && previousStatus !== "PAID") {
      processEmailOutbox(5).catch((emailError) => {
        console.error("Failed to process PAID email outbox:", emailError);
      });
    }

    if (status === "SHIPPED" && previousStatus !== "SHIPPED") {
      try {
        await sendOrderShippedEmail(updated);
      } catch (emailError) {
        console.error("Failed to send SHIPPED email:", emailError);
        // Don't fail the status update if email fails
      }
    }

    // Revalidate admin page to show updated order
    revalidatePath("/admin");

    return { success: true, order: updated };
  } catch (error) {
    console.error("Error updating order status:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update order",
    };
  }
}

export type PaymentRecordFormState = {
  success: boolean;
  message?: string;
  error?: string;
  updatedAt?: number;
};

export async function recordManualRefundForm (
  _previousState: PaymentRecordFormState | undefined,
  formData: FormData
): Promise<PaymentRecordFormState>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN" || !session.user.id) {
    return { success: false, error: "Unauthorized" };
  }

  const orderId = sanitizeInput(formData.get("orderId"));
  const attemptId = sanitizeInput(formData.get("attemptId"));
  const recipientAddress = sanitizeInput(formData.get("recipientAddress"));
  const amount = sanitizeInput(formData.get("amount"));
  const transactionHash = sanitizeInput(formData.get("transactionHash"));
  const notes = sanitizeInput(formData.get("notes"));
  const recipientVerified = formData.get("recipientVerified") === "on";

  if (
    !orderId ||
    !attemptId ||
    !recipientAddress ||
    !amount ||
    !transactionHash
  ) {
    return { success: false, error: "Missing required refund fields." };
  }
  if (!recipientVerified) {
    return {
      success: false,
      error: "Confirm that the recipient address was verified out-of-band.",
    };
  }
  if (!isBaseAddress(recipientAddress)) {
    return { success: false, error: "Enter a valid Base recipient address." };
  }
  if (!isBaseTransactionHash(transactionHash)) {
    return {
      success: false,
      error: "Enter the valid Base transaction hash from the manual refund.",
    };
  }
  if (!/^\d+(?:\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
    return {
      success: false,
      error: "Refund amount must be a positive USDC amount with up to 6 decimals.",
    };
  }

  const attempt = await getPaymentAttemptById(attemptId);
  if (!attempt || attempt.orderId !== orderId) {
    return { success: false, error: "Payment attempt does not match this order." };
  }

  try {
    const result = await recordManualUsdcRefund({
      id: randomUUID(),
      orderId,
      attemptId,
      approvedByUserId: session.user.id,
      recipientAddress,
      amount,
      transactionHash,
      notes,
    });
    const errors: Record<string, string> = {
      ORDER_NOT_REFUNDABLE:
        "Only paid, shipped, or late-paid cancelled orders can be refunded.",
      PAYMENT_ATTEMPT_NOT_REFUNDABLE:
        "This PayRam payment is not a verified filled attempt.",
      REFUND_AMOUNT_EXCEEDS_PAYMENT:
        "This refund would exceed the order's confirmed payment.",
    };
    if (result !== "RECORDED") {
      return {
        success: false,
        error: errors[result] ?? "Refund record was rejected.",
      };
    }
    revalidatePath("/admin");
    return {
      success: true,
      message: "Sent USDC refund recorded.",
      updatedAt: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record refund.",
    };
  }
}

export async function recordTreasurySweepForm (
  _previousState: PaymentRecordFormState | undefined,
  formData: FormData
): Promise<PaymentRecordFormState>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const attemptId = sanitizeInput(formData.get("attemptId"));
  const depositTransactionHash = sanitizeInput(
    formData.get("depositTransactionHash")
  );
  const sweepTransactionHash = sanitizeInput(
    formData.get("sweepTransactionHash")
  );
  const amount = sanitizeInput(formData.get("amount"));

  if (
    !attemptId ||
    !depositTransactionHash ||
    !sweepTransactionHash ||
    !amount
  ) {
    return { success: false, error: "Missing required SmartSweep fields." };
  }
  if (
    !isBaseTransactionHash(depositTransactionHash) ||
    !isBaseTransactionHash(sweepTransactionHash)
  ) {
    return {
      success: false,
      error: "Deposit and sweep hashes must be valid Base transaction hashes.",
    };
  }
  if (!/^\d+(?:\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
    return {
      success: false,
      error: "Sweep amount must be a positive USDC amount with up to 6 decimals.",
    };
  }

  try {
    const config = getPayRamOperationalConfig();
    if (!isBaseAddress(config.treasuryWalletAddress)) {
      return {
        success: false,
        error:
          "Set PAYRAM_TREASURY_WALLET_ADDRESS to your PayRam cold wallet before recording sweeps.",
      };
    }
    const result = await recordPayRamTreasurySweep({
      id: randomUUID(),
      attemptId,
      depositTransactionHash,
      sweepTransactionHash,
      destinationAddress: config.treasuryWalletAddress,
      amount,
    });
    if (result !== "RECORDED") {
      return {
        success: false,
        error:
          result === "DEPOSIT_NOT_CONFIRMED"
            ? "The deposit hash is not attached to a confirmed PayRam attempt."
            : "SmartSweep record was rejected.",
      };
    }
    revalidatePath("/admin");
    return {
      success: true,
      message: "Confirmed SmartSweep treasury transfer recorded.",
      updatedAt: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to record SmartSweep transfer.",
    };
  }
}

export async function resolvePayRamTimeoutForm (
  _previousState: PaymentRecordFormState | undefined,
  formData: FormData
): Promise<PaymentRecordFormState>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const attemptId = sanitizeInput(formData.get("attemptId"));
  const providerChecked = formData.get("providerChecked") === "on";
  if (!attemptId || !providerChecked) {
    return {
      success: false,
      error:
        "Confirm that the PayRam dashboard was checked for this exact invoice.",
    };
  }

  const updated = await resolveUnreferencedAttemptAsFailed(attemptId);
  if (!updated) {
    return {
      success: false,
      error:
        "Only an unreferenced reconciliation-required attempt can be cleared.",
    };
  }

  revalidatePath("/admin");
  return {
    success: true,
    message: "Attempt marked failed; the customer can safely resume the order.",
    updatedAt: Date.now(),
  };
}


export async function updateProductStockAction (formData: FormData)
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const productSlug = formData.get("productSlug");
  const variantLabel = formData.get("variantLabel");
  const stockValue = formData.get("stock");

  if (
    typeof productSlug !== "string" ||
    typeof variantLabel !== "string" ||
    typeof stockValue !== "string"
  ) {
    throw new Error("Missing required fields");
  }

  const nextStock = Math.max(0, Math.trunc(Number(stockValue)));
  if (!Number.isFinite(nextStock)) {
    throw new Error("Stock must be a valid number");
  }

  const product = getProductBySlug(productSlug);
  if (!product) {
    throw new Error("Product not found");
  }

  const variantExists = product.variants.some(
    (variant) => variant.label === variantLabel
  );

  if (!variantExists) {
    throw new Error("Variant not found");
  }

  await setProductStock(productSlug, variantLabel, nextStock);

  revalidatePath("/admin");
  revalidatePath("/store");
  revalidatePath(`/store/product/${productSlug}`);
  revalidatePath(`/store/@modal/(.)product/${productSlug}`);
}

export async function submitOrderStatusForm (
  prevState: OrderStatusFormState | undefined,
  formData: FormData
): Promise<OrderStatusFormState>
{
  const orderIdValue = formData.get("orderId");
  const statusValue = formData.get("status");

  const baseOrderId =
    typeof orderIdValue === "string" ? orderIdValue : prevState?.orderId ?? "";
  const baseStatus = isOrderStatus(statusValue)
    ? statusValue
    : prevState?.status ?? "PENDING_PAYMENT";

  if (typeof orderIdValue !== "string" || !isOrderStatus(statusValue)) {
    return {
      orderId: baseOrderId,
      status: baseStatus,
      success: false,
      error: "Missing required fields",
    };
  }

  const notes = sanitizeInput(formData.get("notes"));
  const trackingNumber = sanitizeInput(formData.get("trackingNumber"));
  const carrierEntry = formData.get("trackingCarrier");
  const trackingCarrier = isTrackingCarrier(carrierEntry)
    ? carrierEntry
    : undefined;

  if (
    statusValue === "SHIPPED" &&
    (!trackingNumber || !trackingCarrier)
  ) {
    return {
      orderId: baseOrderId,
      status: statusValue,
      success: false,
      error: "Tracking number and carrier are required for shipped orders",
    };
  }

  const result = await updateOrderStatusAction(
    orderIdValue,
    statusValue,
    notes,
    trackingNumber,
    trackingCarrier
  );

  if (!result.success || !result.order) {
    return {
      orderId: baseOrderId,
      status: statusValue,
      success: false,
      error: result.error ?? "Failed to update order",
    };
  }

  return {
    orderId: result.order.id,
    status: result.order.status,
    success: true,
    message: `Status updated to ${formatStatusLabel(result.order.status)}`,
    updatedAt: Date.now(),
    trackingNumber: result.order.trackingNumber,
    trackingCarrier: result.order.trackingCarrier,
  };
}

export async function deleteOrderAction (
  orderId: string
): Promise<{ success: boolean; error?: string }>
{
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!orderId) {
      return { success: false, error: "Missing order ID" };
    }

    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) {
      return { success: false, error: "Order not found" };
    }

    if (existingOrder.status !== "CANCELLED") {
      return {
        success: false,
        error:
          "Cancel the unpaid order first so inventory is released atomically before deletion.",
      };
    }
    if (await getLatestPaymentAttemptForOrder(orderId)) {
      return {
        success: false,
        error:
          "Orders with payment attempts are retained as immutable payment audit records.",
      };
    }

    const deleted = await deleteOrder(orderId);

    if (!deleted) {
      return { success: false, error: "Failed to delete order" };
    }

    // Revalidate admin page to remove deleted order
    revalidatePath("/admin");

    return { success: true };
  } catch (error) {
    console.error("Error deleting order:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete order",
    };
  }
}

function sanitizeInput (value: FormDataEntryValue | null): string | undefined
{
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isOrderStatus (value: unknown): value is OrderStatus
{
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

function isTrackingCarrier (
  value: FormDataEntryValue | null
): value is (typeof TRACKING_CARRIERS)[number]
{
  return typeof value === "string" && (TRACKING_CARRIERS as readonly string[]).includes(value);
}

function formatStatusLabel (status: OrderStatus): string
{
  return status
    .split("_")
    .map(
      (segment) => segment.charAt(0) + segment.slice(1).toLowerCase()
    )
    .join(" ");
}
