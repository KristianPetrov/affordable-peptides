"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import MoleculeViewer from "@/components/MoleculeViewer";
import type { Product, Variant } from "@/lib/products";
import {
  getMoleculesForProduct,
  type MoleculeDefinition,
} from "@/lib/molecules";

const POPULARITY_ORDER: string[] = [
  "Tirzepatide",
  "BPC-157",
  "CJC-1295",
  "Ipamorelin",
  "TB-500",
  "AOD 9604",
  "GLP-1",
  "Tesamorelin",
  "BPC + TB Combo",
  "IGF-1 LR3",
  "HGH",
  "KPV",
  "MOTS-C",
  "Retatrutide",
  "Epithalon",
  "GHK-CU",
];

type AddToCartPayload = {
  productName: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
};

type CartItem = {
  key: string;
  productName: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay: string;
  count: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const parsePrice = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;

const parseQuantity = (value: string) =>
  Number(value.replace(/[^0-9.]/g, "")) || 0;

type StoreClientProps = {
  products: Product[];
};

type ProductCardProps = {
  product: Product;
  molecules: MoleculeDefinition[];
  onAddToCart: (payload: AddToCartPayload) => void;
};

function ProductCard({ product, molecules, onAddToCart }: ProductCardProps) {

  const getFirstValidTierIndex = (variant: Variant) =>
    variant.tiers.findIndex(
      (tier) => parseQuantity(tier.quantity) > 0 && parsePrice(tier.price) > 0
    );

  const [selectedTierIndexByVariant, setSelectedTierIndexByVariant] = useState<
    Record<string, number>
  >(() => {
    const initial: Record<string, number> = {};
    for (const variant of product.variants) {
      const defaultIndex = getFirstValidTierIndex(variant);
      initial[variant.label] = defaultIndex === -1 ? 0 : defaultIndex;
    }
    return initial;
  });

  const resolveSelectedIndex = (variant: Variant) => {
    const storedIndex = selectedTierIndexByVariant[variant.label];
    if (typeof storedIndex === "number") {
      return storedIndex;
    }
    const defaultIndex = getFirstValidTierIndex(variant);
    return defaultIndex === -1 ? 0 : defaultIndex;
  };

  const handleSelectTier = (variantLabel: string, tierIndex: number) => {
    setSelectedTierIndexByVariant((prev) => ({
      ...prev,
      [variantLabel]: tierIndex,
    }));
  };

  const handleAddVariantToCart = (variant: Variant) => {
    const selectedIndex = resolveSelectedIndex(variant);
    const selectedTier = variant.tiers[selectedIndex];
    if (!selectedTier) {
      return;
    }

    const tierQuantity = parseQuantity(selectedTier.quantity);
    const tierPrice = parsePrice(selectedTier.price);

    if (!tierQuantity || !tierPrice) {
      return;
    }

    const tierPriceDisplay = selectedTier.price.startsWith("$")
      ? selectedTier.price
      : `$${selectedTier.price}`;

    onAddToCart({
      productName: product.name,
      variantLabel: variant.label,
      tierQuantity,
      tierPrice,
      tierPriceDisplay,
    });
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-purple-900/60 bg-gradient-to-b from-[#13001f] via-[#090012] to-black shadow-[0_20px_60px_rgba(45,0,95,0.45)]">
      <div className="relative h-64 w-full border-b border-purple-900/40 bg-black/40 p-4">
        <MoleculeViewer
          productName={product.name}
          molecules={molecules}
          className="h-full rounded-2xl"
        />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          <p className="text-sm text-zinc-400">
            Select the dosage and volume tier that fits your research needs.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          {product.variants.map((variant) => {
            const selectedIndex = resolveSelectedIndex(variant);
            const selectedTier = variant.tiers[selectedIndex];
            const selectedTierQuantity = selectedTier
              ? parseQuantity(selectedTier.quantity)
              : 0;
            const selectedTierPrice = selectedTier
              ? parsePrice(selectedTier.price)
              : 0;
            const selectedTierDisplay = selectedTier
              ? selectedTier.price.startsWith("$")
                ? selectedTier.price
                : `$${selectedTier.price}`
              : "";
            const addDisabled =
              !selectedTier ||
              selectedTierQuantity === 0 ||
              selectedTierPrice === 0;

            return (
              <div
                key={`${product.name}-${variant.label}`}
                className="flex flex-col gap-4 rounded-2xl border border-purple-900/40 bg-black/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-purple-100">
                  <span className="font-semibold uppercase tracking-wide text-purple-200">
                    {variant.label}
                  </span>
                  <span className="rounded-full border border-purple-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                    Pricing
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {variant.tiers.map((tier, index) => {
                    const tierQuantity = parseQuantity(tier.quantity);
                    const tierPrice = parsePrice(tier.price);
                    const tierPriceDisplay = tier.price.startsWith("$")
                      ? tier.price
                      : `$${tier.price}`;
                    const isUnavailable =
                      tierQuantity === 0 || tierPrice === 0;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        type="button"
                        key={`${variant.label}-${tier.quantity}`}
                        aria-pressed={isSelected}
                        disabled={isUnavailable}
                        onClick={() =>
                          handleSelectTier(variant.label, index)
                        }
                        className={`flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-center text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                          isSelected
                            ? "border-purple-400 bg-purple-500/20 text-white shadow-[0_0_30px_rgba(120,48,255,0.35)]"
                            : "border-purple-900/30 bg-zinc-900/70 text-zinc-200 hover:border-purple-400 hover:bg-purple-500/10 hover:text-white"
                        } ${
                          isUnavailable
                            ? "cursor-not-allowed opacity-40 hover:border-purple-900/30 hover:bg-zinc-900/70"
                            : ""
                        }`}
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Qty {tier.quantity}
                        </span>
                        <span className="mt-1 text-sm font-semibold text-white">
                          {tierPriceDisplay}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-zinc-400">
                    {selectedTier && !addDisabled
                      ? `Selected: Qty ${selectedTier.quantity} • ${selectedTierDisplay}`
                      : "No available tier selected"}
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-purple-900/40"
                    onClick={() => handleAddVariantToCart(variant)}
                    disabled={addDisabled}
                  >
                    Add {variant.label} to Cart
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2 text-xs text-zinc-500">
          Pricing shown for research use only. Contact us for bulk or specialized
          requests.
        </div>
      </div>
    </article>
  );
}

type FloatingCartButtonProps = {
  subtotal: number;
  totalUnits: number;
  cartItems: CartItem[];
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
};

function FloatingCartButton({
  subtotal,
  totalUnits,
  cartItems,
  onIncrement,
  onDecrement,
  onRemove,
}: FloatingCartButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <button
        type="button"
        className="flex items-center gap-3 rounded-full border border-purple-500/60 bg-purple-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_20px_45px_rgba(120,48,255,0.45)] transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>Cart</span>
        <span className="rounded-full bg-purple-500/60 px-3 py-1 text-xs font-semibold">
          {formatCurrency(subtotal)}
        </span>
      </button>
      {isOpen && (
        <div className="w-[320px] max-w-[90vw] rounded-3xl border border-purple-900/60 bg-black/95 p-5 shadow-[0_25px_80px_rgba(45,0,95,0.55)] backdrop-blur">
          <div className="flex items-baseline justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-200">
                Cart Summary
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                {cartItems.length === 0
                  ? "No selections yet. Add peptides to begin checkout."
                  : "Adjust quantities or remove items before finalizing your order."}
              </p>
            </div>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-purple-300 transition hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-purple-900/40 bg-purple-500/10 px-4 py-3 text-xs">
            <div className="uppercase tracking-[0.3em] text-purple-200">
              Subtotal
            </div>
            <div className="text-sm font-semibold text-white">
              {formatCurrency(subtotal)}
            </div>
          </div>
          {totalUnits > 0 && (
            <div className="mt-2 text-xs text-zinc-500">
              {totalUnits} unit{totalUnits === 1 ? "" : "s"} selected
            </div>
          )}

          {cartItems.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {cartItems.map((item) => (
                <li
                  key={item.key}
                  className="rounded-2xl border border-purple-900/40 bg-zinc-950/80 p-4"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">
                      {item.productName}
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-purple-200">
                      {item.variantLabel}
                    </div>
                    <div className="text-xs text-zinc-400">
                      Qty {item.tierQuantity} • {item.count}×{" "}
                      {item.tierPriceDisplay}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(item.tierPrice * item.count)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-1 rounded-full border border-purple-500/60 bg-black/60 px-2 py-1">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full text-lg font-semibold text-purple-200 transition hover:text-white disabled:cursor-not-allowed disabled:text-purple-900/60"
                        onClick={() => onDecrement(item.key)}
                        disabled={item.count === 1}
                        aria-label={`Decrease ${item.productName} ${item.variantLabel} quantity`}
                      >
                        -
                      </button>
                      <span className="px-2 text-sm font-semibold text-white">
                        {item.count}
                      </span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full text-lg font-semibold text-purple-200 transition hover:text-white"
                        onClick={() => onIncrement(item.key)}
                        aria-label={`Increase ${item.productName} ${item.variantLabel} quantity`}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:text-white"
                      onClick={() => onRemove(item.key)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">
              Browse the catalog and add peptides using the “Add to Cart” button
              on each product.
            </p>
          )}
          <div className="mt-5 rounded-2xl border border-purple-900/40 bg-purple-500/10 px-4 py-3 text-xs text-purple-200">
            Pricing displayed is for research use only. Reach out for bulk,
            custom, or specialty sourcing.
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreClient({ products }: StoreClientProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const productMolecules = useMemo(() => {
    const map = new Map<string, MoleculeDefinition[]>();
    for (const product of products) {
      map.set(product.name, getMoleculesForProduct(product.name));
    }
    return map;
  }, [products]);

  const popularityRank = useMemo(() => {
    const rankMap = new Map<string, number>();
    POPULARITY_ORDER.forEach((name, index) => {
      rankMap.set(name, index);
    });
    return rankMap;
  }, []);

  const originalOrder = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((product, index) => {
      map.set(product.name, index);
    });
    return map;
  }, [products]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aRank = popularityRank.get(a.name) ?? Infinity;
      const bRank = popularityRank.get(b.name) ?? Infinity;
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const aOriginal = originalOrder.get(a.name) ?? Infinity;
      const bOriginal = originalOrder.get(b.name) ?? Infinity;
      return aOriginal - bOriginal;
    });
  }, [products, popularityRank, originalOrder]);

  const handleAddToCart = ({
    productName,
    variantLabel,
    tierQuantity,
    tierPrice,
    tierPriceDisplay,
  }: AddToCartPayload) => {
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
          count: 1,
        },
      ];
    });
  };

  const handleUpdateCartCount = (key: string, delta: number) => {
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
  };

  const handleRemoveFromCart = (key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.tierPrice * item.count,
    0
  );

  const totalUnits = cartItems.reduce(
    (sum, item) => sum + item.tierQuantity * item.count,
    0
  );

  return (
    <>
      <main className="space-y-16 pb-24">
        <section className="relative px-6 pt-24 pb-20 sm:px-12 lg:px-16">
          <div
            className="absolute inset-0 bg-gradient-to-b from-black via-[#140018] to-black"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,63,255,0.25),_transparent_65%)] mix-blend-screen"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl space-y-8 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
              Store
            </span>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Research-grade peptides available in flexible volume tiers.
            </h1>
            <p className="mx-auto max-w-3xl text-balance text-base text-zinc-300 sm:text-lg">
              Every product is independently tested to verify purity and potency
              before it reaches your lab. Choose the dosage and quantity that
              matches your protocol, then reach out to complete your order.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/#contact"
                className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(120,48,255,0.35)] transition hover:bg-purple-500 hover:shadow-[0_16px_30px_rgba(120,48,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Talk With Us
              </Link>
              <Link
                href="/"
                className="rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 sm:px-12 lg:px-16">
          <div className="mx-auto max-w-6xl space-y-8">
            <div className="space-y-3 text-center">
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Browse the Catalog
              </h2>
              <p className="text-sm text-zinc-400 sm:text-base">
                Select a dosage and quantity tier for each peptide. Pricing is
                displayed for 1, 5, and 10 unit orders; contact us for custom
                volumes.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.name}
                  product={product}
                  molecules={productMolecules.get(product.name) ?? []}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <FloatingCartButton
        subtotal={subtotal}
        totalUnits={totalUnits}
        cartItems={cartItems}
        onIncrement={(key) => handleUpdateCartCount(key, 1)}
        onDecrement={(key) => handleUpdateCartCount(key, -1)}
        onRemove={handleRemoveFromCart}
      />
    </>
  );
}

