"use server";

import { headers } from "next/headers";

import
{
  getOrderAccessRecordByIdempotencyKey,
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
import { resolveCurrentCatalogItems } from "@/lib/catalog-pricing";
import { auth } from "@/lib/auth";
import { calculateShippingCost } from "@/lib/shipping";
import
{
  finalizeReferralForOrder,
  resolveReferralForOrder,
} from "@/lib/referrals";
import
{
  resolveCheckoutPaymentMethod,
  type CheckoutPaymentMethod,
} from "@/lib/payment-methods";
import {
  getPayRamConfig,
  isPayRamCheckoutEnabled,
  isPayRamMainnetTestMode,
} from "@/lib/payram/config";
import {
  createOrderWithInventoryReservation,
  getLatestPaymentAttemptForOrder,
  type InventoryReservationInput,
} from "@/lib/payram/repository";
import { initializePayRamAttempt } from "@/lib/payram/service";
import {
  hashGuestAccessToken,
  isValidGuestAccessToken,
  verifyGuestAccessToken,
} from "@/lib/payram/security";

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
  billingSameAsShipping?: boolean;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  saveProfile?: boolean;
  referralCode?: string;
  paymentMethod?: CheckoutPaymentMethod;
  idempotencyKey: string;
  guestAccessToken: string;
};

export type CreateOrderResult =
  | {
    success: true;
    orderId: string;
    orderNumber: string;
    shippingCost: number;
    totalAmount: number;
    paymentMethod: CheckoutPaymentMethod;
    paymentUrl: string | null;
    paymentStatusUrl: string;
    guestAccessToken: string;
    paymentRequiresReconciliation: boolean;
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

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

function buildPaymentStatusUrl(orderId: string, guestAccessToken: string): string
{
  const params = new URLSearchParams({
    orderId,
    token: guestAccessToken,
  });
  return `/checkout/payment-status?${params.toString()}`;
}

function buildInventoryReservationItems (
  items: CartItem[]
): InventoryReservationInput[]
{
  const quantities = new Map<string, InventoryReservationInput>();

  for (const item of items) {
    if (!item.productSlug) {
      throw new Error(`Missing inventory identifier for ${item.productName}.`);
    }
    const key = `${item.productSlug}\u0000${item.variantLabel}`;
    const quantity = item.tierQuantity * Math.max(item.count ?? 1, 1);
    const existing = quantities.get(key);
    quantities.set(key, {
      productSlug: item.productSlug,
      variantLabel: item.variantLabel,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  }

  return [...quantities.values()];
}

async function buildExistingOrderResult (
  order: Order,
  guestAccessToken: string
): Promise<CreateOrderResult>
{
  const paymentMethod = order.paymentMethod ?? "manual";
  const attempt =
    paymentMethod === "card_crypto"
      ? await getLatestPaymentAttemptForOrder(order.id)
      : null;

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    shippingCost: order.shippingCost ?? 0,
    totalAmount: order.totalAmount ?? order.subtotal,
    paymentMethod,
    paymentUrl: attempt?.paymentUrl ?? null,
    paymentStatusUrl: buildPaymentStatusUrl(order.id, guestAccessToken),
    guestAccessToken,
    paymentRequiresReconciliation:
      attempt?.status === "CREATING" ||
      attempt?.status === "RECONCILIATION_REQUIRED",
  };
}

function userFacingOrderCreationError (error: unknown): string
{
  const message = error instanceof Error ? error.message : "";
  if (message.includes("INSUFFICIENT_INVENTORY")) {
    return "An item just sold out or no longer has enough stock. Refresh your cart and try again.";
  }
  if (message.includes("unique") || message.includes("order_number")) {
    return "We couldn't reserve this order number. Please try again.";
  }
  return "Failed to create order. Please try again.";
}

export async function createOrderAction (
  input: CreateOrderInput
): Promise<CreateOrderResult>
{
  try {
    if (
      !input.idempotencyKey ||
      !IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)
    ) {
      return {
        success: false,
        error: "Your checkout session is invalid. Refresh the page and try again.",
        errorCode: "VALIDATION_ERROR",
      };
    }
    if (
      !input.guestAccessToken ||
      !isValidGuestAccessToken(input.guestAccessToken)
    ) {
      return {
        success: false,
        error: "Your secure order access token is invalid. Refresh and try again.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    let session = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }

    if (
      isPayRamMainnetTestMode() &&
      input.paymentMethod === "card_crypto" &&
      session?.user.role !== "ADMIN"
    ) {
      return {
        success: false,
        error: "Card checkout is restricted to administrators during live verification.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    const existingAccess = await getOrderAccessRecordByIdempotencyKey(
      input.idempotencyKey
    );
    if (existingAccess) {
      if (
        isPayRamMainnetTestMode() &&
        existingAccess.order.paymentMethod === "card_crypto" &&
        session?.user.role !== "ADMIN"
      ) {
        return {
          success: false,
          error: "This payment is restricted during live verification.",
          errorCode: "VALIDATION_ERROR",
        };
      }
      if (
        !verifyGuestAccessToken(
          input.guestAccessToken,
          existingAccess.guestAccessTokenHash
        )
      ) {
        return {
          success: false,
          error: "This checkout request is already associated with another order.",
          errorCode: "VALIDATION_ERROR",
        };
      }
      return buildExistingOrderResult(
        existingAccess.order,
        input.guestAccessToken
      );
    }

    const cardCryptoEnabled = isPayRamCheckoutEnabled();
    if (input.paymentMethod === "card_crypto" && !cardCryptoEnabled) {
      return {
        success: false,
        error:
          "Card via crypto checkout is not available right now. Choose a manual payment method.",
        errorCode: "VALIDATION_ERROR",
      };
    }
    const paymentMethod = resolveCheckoutPaymentMethod(
      input.paymentMethod,
      cardCryptoEnabled
    );

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

    // Client carts are persisted in localStorage and may contain stale prices.
    // Resolve all lines against the live catalog before trusting any totals.
    const catalogItems = resolveCurrentCatalogItems(input.items);
    if (catalogItems.length !== input.items.length) {
      return {
        success: false,
        error: "An item in your cart is no longer available. Please refresh and try again.",
        errorCode: "VALIDATION_ERROR",
      };
    }

    const calculatedSubtotal = calculateVolumePricing(catalogItems).subtotal;
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

    const userId = session?.user?.id ?? null;
    const orderNumber = generateOrderNumber();
    const now = new Date().toISOString();
    const inventoryItems = buildInventoryReservationItems(catalogItems);

    let referralContext: Awaited<ReturnType<typeof resolveReferralForOrder>> =
      null;
    try {
      referralContext = await resolveReferralForOrder({
        referralCode: input.referralCode,
        customerEmail: input.customerEmail.trim(),
        customerName: input.customerName.trim(),
        userId,
        subtotal: calculatedSubtotal,
        customerPhone: input.customerPhone.trim(),
        shippingStreet: input.shippingStreet.trim(),
        shippingZipCode: input.shippingZipCode.trim(),
        shippingCountry: input.shippingCountry.trim(),
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
    const orderDraft: Order = {
      id: randomUUID(),
      orderNumber,
      status: "PENDING_PAYMENT",
      userId,
      paymentMethod,
      inventoryReservationStatus: "RESERVED",
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
      items: catalogItems,
      subtotal: finalSubtotal,
      shippingCost,
      totalAmount,
      totalUnits: catalogItems.reduce(
        (sum, item) => sum + item.tierQuantity * item.count,
        0
      ),
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
    };
    const attemptId =
      paymentMethod === "card_crypto" ? randomUUID() : null;
    const payRamConfig =
      paymentMethod === "card_crypto" ? getPayRamConfig() : null;
    const atomicResult = await createOrderWithInventoryReservation({
      order: orderDraft,
      paymentMethod,
      idempotencyKey: input.idempotencyKey,
      guestAccessTokenHash: hashGuestAccessToken(input.guestAccessToken),
      inventoryItems,
      attempt:
        attemptId && payRamConfig
          ? {
            id: attemptId,
            invoiceId: attemptId,
            invoiceAmount: totalAmount.toFixed(2),
            tokenAddress: payRamConfig.tokenAddress,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }
          : undefined,
    });
    const order = atomicResult.order;

    if (!atomicResult.created) {
      const access = await getOrderAccessRecordByIdempotencyKey(
        input.idempotencyKey
      );
      if (
        !access ||
        !verifyGuestAccessToken(
          input.guestAccessToken,
          access.guestAccessTokenHash
        )
      ) {
        return {
          success: false,
          error: "This checkout request is already associated with another order.",
          errorCode: "VALIDATION_ERROR",
        };
      }
      return buildExistingOrderResult(order, input.guestAccessToken);
    }

    if (userId && input.saveProfile) {
      try {
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
      } catch (error) {
        console.error("Failed to save checkout profile:", error);
      }
    }

    if (referralContext) {
      try {
        await finalizeReferralForOrder(order, referralContext);
      } catch (error) {
        console.error("Failed to finalize referral attribution:", error);
      }
    }

    let paymentUrl: string | null = null;
    let paymentRequiresReconciliation = false;
    if (paymentMethod === "card_crypto" && attemptId) {
      const initialization = await initializePayRamAttempt({
        order,
        attemptId,
      });
      paymentUrl = initialization.paymentUrl;
      paymentRequiresReconciliation =
        initialization.requiresReconciliation;
    }

    const paymentStatusUrl = buildPaymentStatusUrl(
      order.id,
      input.guestAccessToken
    );

    // Receipt delivery does not determine whether the atomic order succeeds.
    sendOrderEmail(order, {
      paymentMethod,
      paymentStatusUrl,
    }).catch((error) =>
    {
      console.error("Failed to send order email:", error);
    });

    // Revalidate admin/account pages after all mutations (including referrals) succeed
    revalidatePath("/admin");
    revalidatePath("/account");
    revalidatePath("/account/orders");
    revalidatePath("/admin?view=referrals");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      shippingCost,
      totalAmount,
      paymentMethod,
      paymentUrl,
      paymentStatusUrl,
      guestAccessToken: input.guestAccessToken,
      paymentRequiresReconciliation,
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      error: userFacingOrderCreationError(error),
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

    let session = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }
    const sessionOwnsOrder =
      Boolean(session?.user?.id) && session?.user?.id === order.userId;
    const isAdmin = session?.user?.role === "ADMIN";
    const suppliedEmail = input.customerEmail?.trim().toLowerCase();

    if (
      !sessionOwnsOrder &&
      !isAdmin &&
      (!suppliedEmail ||
        order.customerEmail.toLowerCase() !== suppliedEmail)
    ) {
      return {
        success: false,
        error: "Enter the email used at checkout to access this order.",
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
