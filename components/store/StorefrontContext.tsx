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
  productSlug: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: PricingTier[];
  maxVariantUnits?: number | null;
  addCount?: number;
};

export type CartItem = {
  key: string;
  productName: string;
  productSlug?: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  pricingTiers: PricingTier[];
  count: number;
  variantKey: string;
  maxVariantUnits?: number | null;
};

type StorefrontContextValue = {
  cartItems: CartItem[];
  subtotal: number;
  totalUnits: number;
  lineItemTotals: Record<string, number>;
  addToCart: (payload: AddToCartPayload) => number;
  incrementItem: (key: string) => void;
  decrementItem: (key: string) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((payload: AddToCartPayload): number => {
    const {
      productName,
      productSlug,
      variantLabel,
      tierQuantity,
      tierPrice,
      tierPriceDisplay,
      pricingTiers,
      maxVariantUnits,
      addCount,
    } = payload;
    if (!tierQuantity || !tierPrice) {
      return 0;
    }
    const normalizedSlug = productSlug || productName;
    const variantKey = `${normalizedSlug}|${variantLabel}`;
    const key = `${variantKey}|${tierQuantity}`;
    const requestedCount = Math.max(1, addCount ?? 1);
    let addedCount = 0;
    setCartItems((prev) => {
      const resolvedVariantLimit =
        typeof maxVariantUnits === "number"
          ? maxVariantUnits
          : prev.find(
              (item) =>
                (item.variantKey ??
                  `${item.productSlug ?? item.productName}|${item.variantLabel}`) ===
                variantKey
            )?.maxVariantUnits ?? null;
      const currentUnitsForVariant = prev.reduce((sum, item) => {
        const itemVariantKey =
          item.variantKey ??
          `${item.productSlug ?? item.productName}|${item.variantLabel}`;
        if (itemVariantKey !== variantKey) {
          return sum;
        }
        return sum + item.tierQuantity * item.count;
      }, 0);
      const availableUnits =
        resolvedVariantLimit === null
          ? Number.POSITIVE_INFINITY
          : Math.max(resolvedVariantLimit - currentUnitsForVariant, 0);
      const maxAdditionalCount =
        tierQuantity === 0
          ? 0
          : resolvedVariantLimit === null
          ? requestedCount
          : Math.min(
              requestedCount,
              Math.floor(availableUnits / tierQuantity)
            );
      if (maxAdditionalCount <= 0) {
        addedCount = 0;
        return prev;
      }
      addedCount = maxAdditionalCount;
      const index = prev.findIndex((item) => item.key === key);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          count: updated[index].count + maxAdditionalCount,
          maxVariantUnits: resolvedVariantLimit,
        };
        return updated;
      }
      return [
        ...prev,
        {
          key,
          variantKey,
          productName,
          productSlug: normalizedSlug,
          variantLabel,
          tierQuantity,
          tierPrice,
          tierPriceDisplay,
          pricingTiers,
          count: maxAdditionalCount,
          maxVariantUnits: resolvedVariantLimit,
        },
      ];
    });
    return addedCount;
  }, []);

  const updateCartCount = useCallback((key: string, delta: number) => {
    setCartItems((prev) => {
      const next: CartItem[] = [];
      for (const item of prev) {
        if (item.key !== key) {
          next.push(item);
          continue;
        }

        const nextCount = item.count + delta;
        if (nextCount <= 0) {
          continue;
        }

        if (delta > 0 && typeof item.maxVariantUnits === "number") {
          const itemVariantKey =
            item.variantKey ??
            `${item.productSlug ?? item.productName}|${item.variantLabel}`;
          const currentUnitsForVariant = prev.reduce((sum, other) => {
            const otherVariantKey =
              other.variantKey ??
              `${other.productSlug ?? other.productName}|${other.variantLabel}`;
            if (otherVariantKey !== itemVariantKey) {
              return sum;
            }
            return sum + other.tierQuantity * other.count;
          }, 0);
          const proposedUnits =
            currentUnitsForVariant + item.tierQuantity * delta;
          if (proposedUnits > item.maxVariantUnits) {
            next.push(item);
            continue;
          }
        }

        next.push({ ...item, count: nextCount });
      }
      return next;
    });
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

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

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
      clearCart,
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
      clearCart,
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




