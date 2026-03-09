"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import HeroMoleculePreview from "./HeroMoleculePreview";
import type { Product } from "@ap/shared-core";
import { getMoleculesForProduct } from "@ap/shared-core";

const rotationIntervalMs = 5000;

type HighlightDetails = {
  variantLabel: string;
  quantity: string;
  priceDisplay: string;
};

function getHighlightDetails (product: Product): HighlightDetails | null
{
  for (const variant of product.variants) {
    const tier = variant.tiers[0];
    if (tier) {
      return {
        variantLabel: variant.label,
        quantity: tier.quantity,
        priceDisplay: tier.price.startsWith("$")
          ? tier.price
          : `$${tier.price}`,
      };
    }
  }
  return null;
}

type HeroShowcaseProps = {
  products: Product[];
};

export default function HeroShowcase ({ products }: HeroShowcaseProps)
{
  const [activeIndex, setActiveIndex] = useState(0);
  const clampedProducts = useMemo(
    () => products.slice(0, 3),
    [products]
  );
  const showcaseItems = useMemo(
    () =>
      clampedProducts.map((product) => ({
        product,
        highlight: getHighlightDetails(product),
        molecules: getMoleculesForProduct(product.name),
      })),
    [clampedProducts]
  );

  const displayIndex =
    showcaseItems.length === 0
      ? 0
      : Math.min(activeIndex, showcaseItems.length - 1);

  useEffect(() =>
  {
    if (showcaseItems.length <= 1) {
      return;
    }

    const timer = window.setInterval(() =>
    {
      if (document.visibilityState !== "visible") {
        return;
      }
      setActiveIndex((prev) => (prev + 1) % showcaseItems.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(timer);
  }, [showcaseItems.length]);

  return (
    <>
      <div className="relative min-h-[440px] overflow-hidden rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#0b0014] to-black p-6 sm:p-10">
        {showcaseItems.map(({ product, highlight, molecules }, index) =>
        {
          const isActive = index === displayIndex;

          return (
            <article
              key={product.name}
              className={`absolute inset-0 mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-8 text-center transition duration-700 ease-out ${isActive
                  ? "pointer-events-auto opacity-100 blur-0"
                  : "pointer-events-none opacity-0 blur-sm"
                }`}
              aria-hidden={!isActive}
            >
              <div className="relative h-56 w-56 overflow-hidden rounded-full border border-purple-500/60 bg-purple-500/10 shadow-[0_25px_80px_rgba(120,48,255,0.35)]">
                <HeroMoleculePreview
                  productName={product.name}
                  molecules={molecules}
                  active={isActive}
                  className="h-full rounded-full p-3"
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                  {product.name}
                </h3>
                {highlight ? (
                  <p className="text-sm text-zinc-300 sm:text-base">
                    Catalog option:{" "}
                    <span className="font-semibold text-white">
                      {highlight.variantLabel}
                    </span>{" "}
                    • Qty {highlight.quantity} •{" "}
                    <span className="font-semibold text-purple-200">
                      {highlight.priceDisplay}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-zinc-300 sm:text-base">
                    Multiple package options available. See full catalog details
                    in the store.
                  </p>
                )}
              </div>
              <Link
                href="/store"
                className="inline-flex items-center justify-center rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-200 transition hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                View in Store
              </Link>
            </article>
          );
        })}
      </div>

      <div className="flex justify-center gap-3">
        {showcaseItems.map(({ product }, index) =>
        {
          const isActive = index === displayIndex;
          return (
            <button
              key={product.name}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-3 w-10 rounded-full transition ${isActive
                  ? "bg-purple-500 shadow-[0_0_20px_rgba(120,48,255,0.55)]"
                  : "bg-purple-900/40 hover:bg-purple-700/60"
                }`}
              aria-label={`Showcase ${product.name}`}
            />
          );
        })}
      </div>
    </>
  );
}

