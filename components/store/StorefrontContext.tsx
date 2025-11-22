"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  calculateVolumePricing,
  type PricingTier,
} from "@/lib/cart-pricing";

export type AddToCartPayload = {
  productName: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: PricingTier[];
};

export type CartItem = {
  key: string;
  productName: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: PricingTier[];
  count: number;
};

type StorefrontContextValue = {
  cartItems: CartItem[];
  subtotal: number;
  totalUnits: number;
  lineItemTotals: Record<string, number>;
  addToCart: (payload: AddToCartPayload) => void;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  removeItem: (key: string) => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((payload: AddToCartPayload) => {
    const {
      productName,
      variantLabel,
      tierQuantity,
      tierPrice,
      tierPriceDisplay,
      pricingTiers,
    } = payload;
    if (!tierQuantity || !tierPrice) {
      return;
    }
    const key = `${productName}|${variantLabel}|${tierQuantity}`;
    setCartItems((prev) => {
      const index = prev.findIndex((item) => item.key === key);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          count: updated[index].count + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          key,
          productName,
          variantLabel,
          tierQuantity,
          tierPrice,
          tierPriceDisplay,
          pricingTiers,
          count: 1,
        },
      ];
    });
  }, []);

  const updateCartCount = useCallback((key: string, delta: number) => {
    setCartItems((prev) =>
      prev.reduce<CartItem[]>((acc, item) => {
        if (item.key !== key) {
          acc.push(item);
          return acc;
        }

        const nextCount = item.count + delta;
        if (nextCount <= 0) {
          return acc;
        }

        acc.push({ ...item, count: nextCount });
        return acc;
      }, [])
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const incrementItem = useCallback(
    (key: string) => updateCartCount(key, 1),
    [updateCartCount]
  );

  const decrementItem = useCallback(
    (key: string) => updateCartCount(key, -1),
    [updateCartCount]
  );

  const { subtotal, lineItemTotals } = useMemo(
    () => calculateVolumePricing(cartItems),
    [cartItems]
  );

  const totalUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.tierQuantity * item.count, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      subtotal,
      totalUnits,
      lineItemTotals,
      addToCart,
      incrementItem,
      decrementItem,
      removeItem,
    }),
    [
      cartItems,
      subtotal,
      totalUnits,
      lineItemTotals,
      addToCart,
      incrementItem,
      decrementItem,
      removeItem,
    ]
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used within a StorefrontProvider");
  }
  return context;
}




