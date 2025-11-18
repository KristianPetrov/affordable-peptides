import type { CartItem } from "@/components/store/StorefrontContext";

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "CANCELLED";

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
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
};

export function generateOrderNumber(): string {
  const prefix = "AP";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${timestamp}${random}`;
}

export function formatOrderNumber(orderNumber: string): string {
  // Format AP-12345678 to AP-12345-678
  const parts = orderNumber.split("-");
  if (parts.length === 2 && parts[1].length === 11) {
    return `${parts[0]}-${parts[1].slice(0, 5)}-${parts[1].slice(5)}`;
  }
  return orderNumber;
}


