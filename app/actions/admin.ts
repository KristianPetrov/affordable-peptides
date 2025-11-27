"use server";

import { getOrderById, setProductStock, updateOrderStatus } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders";
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

export async function updateOrderStatusAction (
  orderId: string,
  status: OrderStatus,
  notes?: string,
  trackingNumber?: string,
  trackingCarrier?: "UPS" | "USPS"
): Promise<{ success: boolean; error?: string }>
{
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    if (!orderId || !status) {
      return { success: false, error: "Missing required fields" };
    }

    const validStatuses: OrderStatus[] = [
      "PENDING_PAYMENT",
      "PAID",
      "SHIPPED",
      "CANCELLED",
    ];
    if (!validStatuses.includes(status)) {
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

    return { success: true };
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






