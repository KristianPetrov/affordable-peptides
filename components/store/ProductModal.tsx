"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { Product } from "@/lib/products";
import type { MoleculeDefinition } from "@/lib/molecules";

import { ProductCard } from "@/components/store/StoreClient";
import Disclaimer from "@/components/Disclaimer";
import { useStorefront } from "@/components/store/StorefrontContext";

type ProductModalProps = {
  product: Product;
  molecules: MoleculeDefinition[];
};

export default function ProductModal({ product, molecules }: ProductModalProps) {
  const router = useRouter();
  const { addToCart, cartItems } = useStorefront();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleClose = () => router.back();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} detail`}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-purple-900/80 bg-[#070006]/80 backdrop-blur"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full border border-purple-500/50 bg-black/70 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-purple-100 transition hover:border-purple-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Close product modal"
          style={{ zIndex: 20 }}
        >
          Close
        </button>
        <div className="max-h-[80vh] overflow-hidden rounded-3xl border border-purple-900/60 bg-black/60">
          <div className="max-h-[80vh] overflow-y-auto px-4 py-6 pt-10 space-y-6">
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
            <Disclaimer variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
}

