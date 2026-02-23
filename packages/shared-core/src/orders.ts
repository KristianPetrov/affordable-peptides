import { calculateVolumePricing } from "./cart-pricing";
import { calculateShippingCost } from "./shipping";

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "CANCELLED";

export type OrderItem = {
  key: string;
  productName: string;
  productSlug?: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  count: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingCost?: number;
  totalAmount?: number;
  totalUnits: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  trackingNumber?: string;
  trackingCarrier?: "UPS" | "USPS";
  referralPartnerId?: string | null;
  referralPartnerName?: string | null;
  referralCodeId?: string | null;
  referralCode?: string | null;
  referralAttributionId?: string | null;
  referralDiscount?: number;
  referralCommissionPercent?: number;
  referralCommissionAmount?: number;
  orderReceiptEmailId?: string;
  orderReceiptEmailStatus?: string;
  orderReceiptEmailUpdatedAt?: string;
  orderPaidEmailId?: string;
  orderPaidEmailStatus?: string;
  orderPaidEmailUpdatedAt?: string;
  orderShippedEmailId?: string;
  orderShippedEmailStatus?: string;
  orderShippedEmailUpdatedAt?: string;
};

export type OrderTotals = {
  itemsSubtotal: number;
  shippingCost: number;
  total: number;
};

export function calculateOrderTotals(
  order: Pick<Order, "items" | "subtotal"> &
    Partial<Pick<Order, "shippingCost" | "totalAmount" | "status">>
): OrderTotals {
  const itemsSubtotal = calculateVolumePricing(order.items).subtotal;
  const shippingPolicyBaseSubtotal = Math.max(itemsSubtotal, order.subtotal);
  const policyShippingCost = calculateShippingCost(shippingPolicyBaseSubtotal);
  const storedTotal =
    typeof order.totalAmount === "number" && Number.isFinite(order.totalAmount)
      ? order.totalAmount
      : null;
  const storedShipping =
    typeof order.shippingCost === "number" && Number.isFinite(order.shippingCost)
      ? order.shippingCost
      : null;
  const shippingFromTotal =
    storedTotal === null ? null : Math.max(0, storedTotal - order.subtotal);

  let shippingCost =
    storedShipping !== null
      ? storedShipping
      : shippingFromTotal !== null
        ? shippingFromTotal
        : policyShippingCost;

  let total =
    storedTotal !== null && storedTotal > 0
      ? storedTotal
      : order.subtotal + shippingCost;

  const shouldEnforceShipping = order.status !== "CANCELLED";
  if (shouldEnforceShipping && policyShippingCost > 0) {
    const minimumTotal = order.subtotal + policyShippingCost;
    const missingShipping = total < minimumTotal - 0.01;

    if (missingShipping) {
      shippingCost = policyShippingCost;
      total = minimumTotal;
    } else if (shippingCost <= 0) {
      shippingCost = Math.max(policyShippingCost, Math.max(0, total - order.subtotal));
    }
  }

  return { itemsSubtotal, shippingCost, total };
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const lastFive = timestamp.slice(-5);
  const randomDigit = Math.floor(Math.random() * 10).toString();
  const sixDigit = (lastFive + randomDigit).slice(-6);
  return sixDigit.padStart(6, "0");
}

export function formatOrderNumber(orderNumber: string): string {
  return orderNumber;
}

export function normalizeOrderNumberInput(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length !== 6 || !/^\d{6}$/.test(digitsOnly)) {
    return null;
  }

  return digitsOnly;
}
