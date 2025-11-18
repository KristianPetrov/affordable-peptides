"use server";

import { headers } from "next/headers";

import { createOrder } from "@/lib/db";
import { sendOrderEmail } from "@/lib/email";
import { generateOrderNumber } from "@/lib/orders";
import type { CartItem } from "@/components/store/StorefrontContext";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import
{
  extractClientIp,
  orderCreationRateLimiter,
} from "@/lib/rate-limit";

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
  | {
    success: false;
    error: string;
    errorCode?: "RATE_LIMITED" | "VALIDATION_ERROR" | "UNKNOWN";
    retryAfterSeconds?: number;
  };

function formatRetryAfter (ms: number):
  {
    humanized: string;
    seconds: number;
  }
{
  const seconds = Math.max(1, Math.ceil(ms / 1000));

  if (seconds < 60) {
    return {
      humanized: `${seconds} second${seconds === 1 ? "" : "s"}`,
      seconds,
    };
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return {
      humanized: `${minutes} minute${minutes === 1 ? "" : "s"}`,
      seconds,
    };
  }

  const hours = Math.ceil(minutes / 60);

  return {
    humanized: `${hours} hour${hours === 1 ? "" : "s"}`,
    seconds,
  };
}

export async function createOrderAction (
  input: CreateOrderInput
): Promise<CreateOrderResult>
{
  try {
    // Validate required fields
    if (
      !input.items ||
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      return {
        success: false,
        error: "Cart is empty",
        errorCode: "VALIDATION_ERROR",
      };
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
      return {
        success: false,
        error: "Missing required fields",
        errorCode: "VALIDATION_ERROR",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.customerEmail)) {
      return {
        success: false,
        error: "Invalid email address format",
        errorCode: "VALIDATION_ERROR",
      };
    }

    // Validate phone number format (basic)
    const phoneRegex = /^[\d\s\(\)\-\+]+$/;
    if (!phoneRegex.test(input.customerPhone)) {
      return {
        success: false,
        error: "Invalid phone number format",
        errorCode: "VALIDATION_ERROR",
      };
    }

    // Validate subtotal matches items
    const calculatedSubtotal = input.items.reduce(
      (sum, item) => sum + item.tierPrice * item.count,
      0
    );
    if (Math.abs(calculatedSubtotal - input.subtotal) > 0.01) {
      return {
        success: false,
        error: "Subtotal mismatch",
        errorCode: "VALIDATION_ERROR",
      };
    }

    let headerList: Awaited<ReturnType<typeof headers>> | null = null;

    try {
      headerList = await headers();
    } catch {
      headerList = null;
    }

    const clientIp = extractClientIp(headerList);
    const normalizedEmail = input.customerEmail.trim().toLowerCase();

    const rateLimitChecks = [
      orderCreationRateLimiter.check(["ip", clientIp]),
      orderCreationRateLimiter.check(["email", normalizedEmail]),
    ];

    const blockedCheck = rateLimitChecks.find((check) => !check.success);

    if (blockedCheck) {
      const { humanized, seconds } = formatRetryAfter(
        blockedCheck.retryAfterMs || blockedCheck.windowMs
      );

      return {
        success: false,
        error: `Too many recent order attempts. Please wait ${humanized} before trying again.`,
        errorCode: "RATE_LIMITED",
        retryAfterSeconds: seconds,
      };
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
    sendOrderEmail(order).catch((error) =>
    {
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
      errorCode: "UNKNOWN",
    };
  }
}


