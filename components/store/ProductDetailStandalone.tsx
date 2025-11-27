"use client";

import type { Product } from "@/lib/products";
import type { MoleculeDefinition } from "@/lib/molecules";

import {
  ProductCard,
  FloatingCartButton,
} from "@/components/store/StoreClient";
import Disclaimer from "@/components/Disclaimer";
import { useStorefront } from "@/components/store/StorefrontContext";

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




