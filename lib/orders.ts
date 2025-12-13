import type { CartItem } from "@/components/store/StorefrontContext";

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "CANCELLED";

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
  items: CartItem[];
  subtotal: number;
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
};

export function generateOrderNumber (): string
{
  // Generate a 6-digit order number
  // Use timestamp to ensure uniqueness, then pad to 6 digits
  const timestamp = Date.now().toString();
  // Take last 5 digits of timestamp and add a random digit to make 6 digits
  const lastFive = timestamp.slice(-5);
  const randomDigit = Math.floor(Math.random() * 10).toString();
  const sixDigit = (lastFive + randomDigit).slice(-6);

  // Ensure it's exactly 6 digits
  return sixDigit.padStart(6, "0");
}

export function formatOrderNumber (orderNumber: string): string
{
  // Just return the order number as-is (it's already a 6-digit number)
  return orderNumber;
}

export function normalizeOrderNumberInput (input: string | null | undefined): string | null
{
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Remove any non-digit characters (spaces, dashes, etc.)
  const digitsOnly = trimmed.replace(/\D/g, "");

  // Must be exactly 6 digits
  if (digitsOnly.length !== 6 || !/^\d{6}$/.test(digitsOnly)) {
    return null;
  }

  return digitsOnly;
}


