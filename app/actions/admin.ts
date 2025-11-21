"use server";

import { updateOrderStatus } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export async function updateOrderStatusAction (
  orderId: string,
  status: OrderStatus,
  notes?: string
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

    const updated = await updateOrderStatus(orderId, status, notes);

    if (!updated) {
      return { success: false, error: "Order not found" };
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







