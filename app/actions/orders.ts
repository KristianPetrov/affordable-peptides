"use server";

import { createOrder } from "@/lib/db";
import { sendOrderEmail } from "@/lib/email";
import { generateOrderNumber } from "@/lib/orders";
import type { CartItem } from "@/components/store/StorefrontContext";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

type CreateOrderInput = {
  items: CartItem[];
  subtotal: number;
  totalUnits: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
};

export type CreateOrderResult =
  | { success: true; orderId: string; orderNumber: string }
  | { success: false; error: string };

export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    // Validate required fields
    if (
      !input.items ||
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      return { success: false, error: "Cart is empty" };
    }

    if (
      !input.customerName ||
      !input.customerEmail ||
      !input.customerPhone ||
      !input.shippingStreet ||
      !input.shippingCity ||
      !input.shippingState ||
      !input.shippingZipCode ||
      !input.shippingCountry
    ) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.customerEmail)) {
      return { success: false, error: "Invalid email address format" };
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[\d\s\(\)\-\+]+$/;
    if (!phoneRegex.test(input.customerPhone)) {
      return { success: false, error: "Invalid phone number format" };
    }

    // Validate subtotal matches items
    const calculatedSubtotal = input.items.reduce(
      (sum, item) => sum + item.tierPrice * item.count,
      0
    );
    if (Math.abs(calculatedSubtotal - input.subtotal) > 0.01) {
      return { success: false, error: "Subtotal mismatch" };
    }

    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const order = await createOrder({
      id: randomUUID(),
      orderNumber,
      status: "PENDING_PAYMENT",
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim(),
      customerPhone: input.customerPhone.trim(),
      shippingAddress: {
        street: input.shippingStreet.trim(),
        city: input.shippingCity.trim(),
        state: input.shippingState.trim(),
        zipCode: input.shippingZipCode.trim(),
        country: input.shippingCountry.trim(),
      },
      items: input.items,
      subtotal: input.subtotal,
      totalUnits: input.totalUnits,
      createdAt: now,
      updatedAt: now,
    });

    // Send email notification (non-blocking, don't fail order if email fails)
    sendOrderEmail(order).catch((error) => {
      console.error("Failed to send order email:", error);
      // Log but don't throw - order is still created
    });

    // Revalidate admin page to show new order
    revalidatePath("/admin");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create order",
    };
  }
}


