"use server";

import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import
{
  createOrder,
  getOrderByOrderNumber,
  updateOrderStatus,
  upsertCustomerProfile,
} from "@/lib/db";
import { sendOrderEmail } from "@/lib/email";
import
{
  generateOrderNumber,
  normalizeOrderNumberInput,
  type Order,
  type PaymentMethod,
} from "@/lib/orders";
import type { CartItem } from "@/components/store/StorefrontContext";
import
{
  extractClientIp,
  orderLookupRateLimiter,
  orderCreationRateLimiter,
} from "@/lib/rate-limit";
import { calculateVolumePricing } from "@/lib/cart-pricing";
import { auth } from "@/lib/auth";
import { calculateShippingCost } from "@/lib/shipping";
import
{
  applyInventoryAdjustments,
  loadInventoryMap,
  prepareInventoryAdjustments,
} from "@/lib/inventory";
import
{
  finalizeReferralForOrder,
  resolveReferralForOrder,
} from "@/lib/referrals";
import { sendTikTokCompletePayment } from "@/lib/tiktok-conversions";
import { submitNmiSale, voidNmiTransaction } from "@/lib/nmi";

type CreateOrderInput = {
  items: CartItem[];
  subtotal: number;
  cartSubtotal?: number;
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
  referralCode?: string;
  paymentMethod?: PaymentMethod;
  paymentToken?: string;
  acceptedTerms: boolean;
  acceptedResearchUse: boolean;
};

const ANALYTICS_CONSENT_COOKIE = "ap_analytics_consent";

export type CreateOrderResult =
  | {
    success: true;
    orderId: string;
    orderNumber: string;
    shippingCost: number;
    totalAmount: number;
    orderStatus: Order["status"];
    paymentMethod: PaymentMethod;
  }
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

function getSelectedPaymentMethod (input: CreateOrderInput): PaymentMethod
{
  return input.paymentMethod === "NMI_CARD" ? "NMI_CARD" : "MANUAL";
}

function formatNmiFailureMessage (responseText: string | null | undefined): string
{
  const normalized = responseText?.trim();

  if (!normalized || /route not found/i.test(normalized)) {
    return "We couldn't process your card right now. Please try again in a moment.";
  }

  return normalized;
}

async function rollbackFailedCheckout (input: {
  createdOrder: Order | null;
  paymentMethod: PaymentMethod;
  paymentTransactionId?: string | null;
}): Promise<void>
{
  if (input.paymentMethod === "NMI_CARD" && input.paymentTransactionId) {
    try {
      await voidNmiTransaction(input.paymentTransactionId);
    } catch (voidError) {
      console.error("Failed to void NMI transaction after checkout error:", voidError);
    }
  }

  if (input.createdOrder) {
    try {
      await updateOrderStatus(
        input.createdOrder.id,
        "CANCELLED",
        input.paymentMethod === "NMI_CARD"
          ? "Order was cancelled automatically after a checkout finalization error. Card charge was voided."
          : "Order was cancelled automatically after a checkout finalization error."
      );
    } catch (cancelError) {
      console.error("Failed to cancel order after checkout error:", cancelError);
    }
  }
}

async function runPostOrderEffects (input: {
  order: Order;
  userId: string | null;
  saveProfile: boolean;
  customerInput: CreateOrderInput;
  referralContext: Awaited<ReturnType<typeof resolveReferralForOrder>>;
  analyticsConsentGranted: boolean;
}): Promise<void>
{
  sendOrderEmail(input.order).catch((error) =>
  {
    console.error("Failed to send order email:", error);
  });

  if (input.order.status === "PAID" && input.analyticsConsentGranted) {
    sendTikTokCompletePayment(input.order).catch((error) =>
    {
      console.error("Failed to send TikTok CompletePayment event:", error);
    });
  }

  if (input.userId && input.saveProfile) {
    try {
      await upsertCustomerProfile(input.userId, {
        fullName: input.customerInput.customerName.trim(),
        phone: input.customerInput.customerPhone.trim(),
        shippingStreet: input.customerInput.shippingStreet.trim(),
        shippingCity: input.customerInput.shippingCity.trim(),
        shippingState: input.customerInput.shippingState.trim(),
        shippingZipCode: input.customerInput.shippingZipCode.trim(),
        shippingCountry: input.customerInput.shippingCountry.trim(),
      });

      revalidatePath("/account/profile");
      revalidatePath("/checkout");
    } catch (profileError) {
      console.error("Failed to save customer profile after checkout:", profileError);
    }
  }

  if (input.referralContext) {
    try {
      await finalizeReferralForOrder(input.order, input.referralContext);
    } catch (referralError) {
      console.error("Failed to finalize referral attribution:", referralError);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/account");
  revalidatePath("/account/orders");
  revalidatePath("/admin?view=referrals");
}

function hasAnalyticsConsent (cookieHeader: string | null | undefined): boolean
{
  if (!cookieHeader) {
    return false;
  }

  const cookieEntry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`));

  if (!cookieEntry) {
    return false;
  }

  const [, rawValue = ""] = cookieEntry.split("=");
  return decodeURIComponent(rawValue).trim().toLowerCase() === "granted";
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

    if (!input.acceptedTerms || !input.acceptedResearchUse) {
      return {
        success: false,
        error:
          "Please accept the Terms, Privacy, Shipping, Refund, and Research Use Only policies before placing your order.",
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

    const paymentMethod = getSelectedPaymentMethod(input);

    if (paymentMethod === "NMI_CARD" && !input.paymentToken?.trim()) {
      return {
        success: false,
        error: "Your payment details are incomplete. Please finish entering your card information.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    // Validate subtotal matches items
    const calculatedSubtotal = calculateVolumePricing(input.items).subtotal;
    const submittedCartSubtotal =
      typeof input.cartSubtotal === "number"
        ? input.cartSubtotal
        : input.subtotal;
    if (Math.abs(calculatedSubtotal - submittedCartSubtotal) > 0.01) {
      return {
        success: false,
        error: "Your cart total changed. Please refresh and try again.",
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
    const analyticsConsentGranted = hasAnalyticsConsent(
      headerList?.get("cookie")
    );

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

    let referralContext: Awaited<ReturnType<typeof resolveReferralForOrder>> =
      null;
    try {
      referralContext = await resolveReferralForOrder({
        referralCode: input.referralCode,
        customerEmail: input.customerEmail.trim(),
        customerName: input.customerName.trim(),
        userId,
        subtotal: calculatedSubtotal,
      });
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "We couldn't apply that referral code.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    const referralDiscount = referralContext?.referralDiscount ?? 0;
    const finalSubtotal = Math.max(0, calculatedSubtotal - referralDiscount);
    if (Math.abs(finalSubtotal - input.subtotal) > 0.01) {
      return {
        success: false,
        error: "Referral discount mismatch. Please resubmit your order.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    const shippingCost = calculateShippingCost(calculatedSubtotal);
    const totalAmount = finalSubtotal + shippingCost;
    const now = new Date().toISOString();

    const baseOrderData = {
      id: randomUUID(),
      orderNumber,
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
      subtotal: finalSubtotal,
      shippingCost,
      totalAmount,
      paymentMethod,
      totalUnits: input.totalUnits,
      createdAt: now,
      updatedAt: now,
      referralPartnerId: referralContext?.referralPartnerId ?? undefined,
      referralPartnerName: referralContext?.referralPartnerName ?? undefined,
      referralCodeId: referralContext?.referralCodeId ?? undefined,
      referralCode: referralContext?.referralCodeValue ?? undefined,
      referralAttributionId: referralContext?.attributionId ?? undefined,
      referralDiscount,
      referralCommissionPercent: referralContext?.referralCommissionPercent ?? 0,
      referralCommissionAmount: referralContext?.referralCommissionAmount ?? 0,
    } satisfies Omit<Order, "status">;

    let createdOrder: Order | null = null;
    let paymentTransactionId: string | null = null;

    try {
      if (paymentMethod === "NMI_CARD") {
        const saleResult = await submitNmiSale({
          amount: totalAmount,
          orderNumber,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          billingStreet: input.shippingStreet,
          billingCity: input.shippingCity,
          billingState: input.shippingState,
          billingZipCode: input.shippingZipCode,
          billingCountry: input.shippingCountry,
          paymentToken: input.paymentToken ?? "",
        });

        if (!saleResult.approved) {
          return {
            success: false,
            error: formatNmiFailureMessage(saleResult.responseText),
            errorCode: "VALIDATION_ERROR",
          };
        }

        paymentTransactionId = saleResult.transactionId;

        createdOrder = await createOrder({
          ...baseOrderData,
          status: "PAID",
          paymentTransactionId: paymentTransactionId ?? undefined,
          paidAt: now,
        });
      } else {
        createdOrder = await createOrder({
          ...baseOrderData,
          status: "PENDING_PAYMENT",
        });
      }

      await applyInventoryAdjustments(reservation.adjustments);
    } catch (checkoutError) {
      await rollbackFailedCheckout({
        createdOrder,
        paymentMethod,
        paymentTransactionId,
      });
      throw checkoutError;
    }

    if (!createdOrder) {
      throw new Error("Order could not be finalized.");
    }

    await runPostOrderEffects({
      order: createdOrder,
      userId,
      saveProfile: Boolean(userId && input.saveProfile),
      customerInput: input,
      referralContext,
      analyticsConsentGranted,
    });

    return {
      success: true,
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      shippingCost,
      totalAmount,
      orderStatus: createdOrder.status,
      paymentMethod,
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
  customerEmail: string;
}): Promise<LookupOrderResult>
{
  const normalizedOrderNumber = normalizeOrderNumberInput(input.orderNumber);

  if (!normalizedOrderNumber) {
    return {
      success: false,
      error: "Enter a valid 6-digit order number (example: 123456).",
    };
  }

  const suppliedEmail = input.customerEmail?.trim().toLowerCase() ?? "";
  if (!suppliedEmail) {
    return {
      success: false,
      error: "Enter the email used at checkout.",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(suppliedEmail)) {
    return {
      success: false,
      error: "Enter a valid email address.",
    };
  }

  try {
    let headerList: Awaited<ReturnType<typeof headers>> | null = null;

    try {
      headerList = await headers();
    } catch {
      headerList = null;
    }

    const clientIp = extractClientIp(headerList);
    const rateLimitChecks = [
      orderLookupRateLimiter.check(["ip", clientIp]),
      orderLookupRateLimiter.check(["email", suppliedEmail]),
      orderLookupRateLimiter.check(["order", normalizedOrderNumber, suppliedEmail]),
    ];
    const blockedCheck = rateLimitChecks.find((check) => !check.success);

    if (blockedCheck) {
      const { humanized } = formatRetryAfter(
        blockedCheck.retryAfterMs || blockedCheck.windowMs
      );
      return {
        success: false,
        error: `Too many lookup attempts. Please wait ${humanized} before trying again.`,
      };
    }

    const order = await getOrderByOrderNumber(normalizedOrderNumber);

    if (!order || order.customerEmail.toLowerCase() !== suppliedEmail) {
      return {
        success: false,
        error: "We couldn't verify an order with the provided details.",
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


