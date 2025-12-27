"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/products";
import type { MoleculeDefinition } from "@/lib/molecules";

import {
  ProductCard,
  FloatingCartButton,
} from "@/components/store/StoreClient";
import Disclaimer from "@/components/Disclaimer";
import { useStorefront } from "@/components/store/StorefrontContext";
import { createTikTokEventBase, tiktokTrack } from "@/lib/analytics/tiktok";

const parsePrice = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
const parseQuantity = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

function getViewContentValue(product: Product): number {
  let best: number | null = null;

  for (const variant of product.variants) {
    for (const tier of variant.tiers) {
      const quantity = parseQuantity(tier.quantity);
      const price = parsePrice(tier.price);
      if (!quantity || !price) {
        continue;
      }
      // Prefer the single-unit tier if present; otherwise fall back to the
      // smallest tier price we can find.
      const candidate = quantity === 1 ? price : price;
      best = best === null ? candidate : Math.min(best, candidate);
    }
  }

  return best ?? 0;
}

type ProductDetailStandaloneProps = {
  product: Product;
  molecules: MoleculeDefinition[];
};

export default function ProductDetailStandalone({
  product,
  molecules,
}: ProductDetailStandaloneProps) {
  const {
    addToCart,
    cartItems,
    subtotal,
    totalUnits,
    incrementItem,
    decrementItem,
    removeItem,
    lineItemTotals,
  } = useStorefront();

  useEffect(() => {
    tiktokTrack("ViewContent", {
      ...createTikTokEventBase(),
      currency: "USD",
      value: getViewContentValue(product),
      content_id: product.slug,
      content_type: "product",
      content_name: product.name,
    });
  }, [product]);

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <ProductCard
          product={product}
          molecules={molecules}
          cartItems={cartItems}
          onAddToCart={addToCart}
          defaultExpanded
          forceExpanded
          showExpandToggle={false}
          showModalLink={false}
        />
        <Disclaimer />
      </div>
      <FloatingCartButton
        subtotal={subtotal}
        totalUnits={totalUnits}
        cartItems={cartItems}
        lineItemTotals={lineItemTotals}
        onIncrement={incrementItem}
        onDecrement={decrementItem}
        onRemove={removeItem}
      />
    </>
  );
}




