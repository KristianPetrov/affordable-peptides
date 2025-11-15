"use client";

import type { Product } from "@/lib/products";
import type { MoleculeDefinition } from "@/lib/molecules";

import { ProductCard } from "@/components/store/StoreClient";
import { useStorefront } from "@/components/store/StorefrontContext";

type ProductDetailStandaloneProps = {
  product: Product;
  molecules: MoleculeDefinition[];
};

export default function ProductDetailStandalone({
  product,
  molecules,
}: ProductDetailStandaloneProps) {
  const { addToCart } = useStorefront();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <ProductCard
        product={product}
        molecules={molecules}
        onAddToCart={addToCart}
        defaultExpanded
        forceExpanded
        showExpandToggle={false}
        showModalLink={false}
      />
    </div>
  );
}




