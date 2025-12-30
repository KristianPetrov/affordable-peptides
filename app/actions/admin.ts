"use server";

import { getOrderById, setProductStock, updateOrderStatus, deleteOrder } from "@/lib/db";
import type { Order, OrderStatus } from "@/lib/orders";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getProductBySlug } from "@/lib/products";
import
{
  applyInventoryAdjustments,
  loadInventoryMap,
  prepareInventoryAdjustments,
  type StockAdjustment,
} from "@/lib/inventory";
import { sendOrderPaidEmail, sendOrderShippedEmail } from "@/lib/email";
import { sendTikTokCompletePayment } from "@/lib/tiktok-conversions";

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
    let stockAdjustments: StockAdjustment[] = [];

    if (status === "CANCELLED" && previousStatus !== "CANCELLED") {
      const inventoryMap = await loadInventoryMap();
      const restockResult = prepareInventoryAdjustments(
        existingOrder.items,
        inventoryMap,
        "restock"
      );

      if (!restockResult.success) {
        return { success: false, error: restockResult.error };
      }

      stockAdjustments = restockResult.adjustments;
    } else if (previousStatus === "CANCELLED" && status !== "CANCELLED") {
      const inventoryMap = await loadInventoryMap();
      const reserveResult = prepareInventoryAdjustments(
        existingOrder.items,
        inventoryMap,
        "reserve"
      );

      if (!reserveResult.success) {
        return { success: false, error: reserveResult.error };
      }

      stockAdjustments = reserveResult.adjustments;
    }

    const updated = await updateOrderStatus(orderId, status, notes, trackingNumber, trackingCarrier);

    if (!updated) {
      return { success: false, error: "Order not found" };
    }

    if (stockAdjustments.length > 0) {
      await applyInventoryAdjustments(stockAdjustments);
    }

    // Send email notifications for status changes
    if (status === "PAID" && previousStatus !== "PAID") {
      try {
        await sendOrderPaidEmail(updated);
      } catch (emailError) {
        console.error("Failed to send PAID email:", emailError);
        // Don't fail the status update if email fails
      }
    }

    // TikTok Conversions API: only fire paid conversion when payment is first confirmed.
    if (status === "PAID" && previousStatus === "PENDING_PAYMENT") {
      sendTikTokCompletePayment(updated).catch((error) => {
        console.error("Failed to send TikTok CompletePayment event:", error);
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

    // If order is not cancelled, restock inventory before deleting
    if (existingOrder.status !== "CANCELLED") {
      const inventoryMap = await loadInventoryMap();
      const restockResult = prepareInventoryAdjustments(
        existingOrder.items,
        inventoryMap,
        "restock"
      );

      if (!restockResult.success) {
        return { success: false, error: restockResult.error };
      }

      await applyInventoryAdjustments(restockResult.adjustments);
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
