"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  calculateVolumePricing,
  type PricingTier,
} from "@/lib/cart-pricing";
import { createTikTokEventBase, tiktokTrack } from "@/lib/analytics/tiktok";

const CART_STORAGE_KEY = "affordable-peptides:cart:v1";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.key === "string" &&
    typeof value.productName === "string" &&
    typeof value.variantLabel === "string" &&
    typeof value.tierQuantity === "number" &&
    typeof value.tierPrice === "number" &&
    typeof value.tierPriceDisplay === "string" &&
    Array.isArray(value.pricingTiers) &&
    typeof value.count === "number" &&
    typeof value.variantKey === "string"
  );
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) {
        hasHydratedRef.current = true;
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        hasHydratedRef.current = true;
        return;
      }
      const restored = parsed.filter(isValidCartItem);
      setCartItems(restored);
    } catch {
      // If storage is corrupted/unreadable, reset it.
      try {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        // ignore
      }
    } finally {
      hasHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedRef.current) {
      return;
    }
    try {
      if (cartItems.length === 0) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // ignore storage write errors (private mode, quota, etc.)
    }
  }, [cartItems]);

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

    if (addedCount > 0) {
      tiktokTrack("AddToCart", {
        ...createTikTokEventBase(),
        currency: "USD",
        value: tierPrice * addedCount,
        content_id: normalizedSlug,
        content_type: "product",
        content_name: productName,
        quantity: addedCount,
      });
    }

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




