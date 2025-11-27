"use server";

import { headers } from "next/headers";

import
{
  createOrder,
  getOrderByOrderNumber,
  upsertCustomerProfile,
} from "@/lib/db";
import { sendOrderEmail } from "@/lib/email";
import { generateOrderNumber, normalizeOrderNumberInput } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import type { CartItem } from "@/components/store/StorefrontContext";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import
{
  extractClientIp,
  orderCreationRateLimiter,
} from "@/lib/rate-limit";
import { calculateVolumePricing } from "@/lib/cart-pricing";
import { auth } from "@/lib/auth";
import
{
  applyInventoryAdjustments,
  loadInventoryMap,
  prepareInventoryAdjustments,
} from "@/lib/inventory";

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
  saveProfile?: boolean;
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
    const calculatedSubtotal = calculateVolumePricing(input.items).subtotal;
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

    let session = null;

    try {
      session = await auth();
    } catch {
      session = null;
    }

    const userId = session?.user?.id ?? null;
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();

    const inventoryMap = await loadInventoryMap();
    const reservation = prepareInventoryAdjustments(
      input.items,
      inventoryMap,
      "reserve"
    );

    if (!reservation.success) {
      return {
        success: false,
        error: reservation.error,
        errorCode: "VALIDATION_ERROR",
      };
    }

    const order = await createOrder({
      id: randomUUID(),
      orderNumber,
      status: "PENDING_PAYMENT",
      userId,
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

    await applyInventoryAdjustments(reservation.adjustments);

    // Send email notification (non-blocking, don't fail order if email fails)
    sendOrderEmail(order).catch((error) =>
    {
      console.error("Failed to send order email:", error);
      // Log but don't throw - order is still created
    });

    // Revalidate admin page to show new order
    revalidatePath("/admin");
    revalidatePath("/account");
    revalidatePath("/account/orders");

    if (userId && input.saveProfile) {
      await upsertCustomerProfile(userId, {
        fullName: input.customerName.trim(),
        phone: input.customerPhone.trim(),
        shippingStreet: input.shippingStreet.trim(),
        shippingCity: input.shippingCity.trim(),
        shippingState: input.shippingState.trim(),
        shippingZipCode: input.shippingZipCode.trim(),
        shippingCountry: input.shippingCountry.trim(),
      });

      revalidatePath("/account/profile");
      revalidatePath("/checkout");
    }

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

export type LookupOrderResult =
  | { success: true; order: Order }
  | { success: false; error: string };

export async function lookupOrderAction (input: {
  orderNumber: string;
  customerEmail?: string;
}): Promise<LookupOrderResult>
{
  const normalizedOrderNumber = normalizeOrderNumberInput(input.orderNumber);

  if (!normalizedOrderNumber) {
    return {
      success: false,
      error: "Enter a valid 6-digit order number (example: 123456).",
    };
  }

  try {
    const order = await getOrderByOrderNumber(normalizedOrderNumber);

    if (!order) {
      return {
        success: false,
        error: "We couldn't find an order with that number.",
      };
    }

    const suppliedEmail = input.customerEmail?.trim().toLowerCase();
    if (suppliedEmail && order.customerEmail.toLowerCase() !== suppliedEmail) {
      return {
        success: false,
        error: "That email doesn't match the order on file.",
      };
    }

    return {
      success: true,
      order,
    };
  } catch (error) {
    console.error("Error looking up order:", error);
    return {
      success: false,
      error: "Something went wrong while looking up your order.",
    };
  }
}


