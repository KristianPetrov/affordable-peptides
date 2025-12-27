"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import MoleculeViewer from "@/components/MoleculeViewer";
import ProductMockup from "@/components/ProductMockup";
import Disclaimer from "@/components/Disclaimer";
import {
  type AddToCartPayload,
  type CartItem,
  useStorefront,
} from "@/components/store/StorefrontContext";
import {
  productCategories,
  type Product,
  type ProductCategory,
  type ProductCategoryId,
  type Variant,
} from "@/lib/products";
import {
  getMoleculesForProduct,
  type MoleculeDefinition,
} from "@/lib/molecules";
import { createTikTokEventBase, tiktokTrack } from "@/lib/analytics/tiktok";

const POPULARITY_ORDER: string[] = [
  "Tirzepatide",
  "5 Amino 1 Q",
  "BPC-157",
  "CJC-1295",
  "Selank",
  "Semax",
  "Ipamorelin",
  "TB-500",
  "AOD 9604",
  "Tesamorelin",
  "BPC + TB Combo",
  "Vitamin B12 1mg/mL - 10ml Bottle",
  "IGF-1 LR3",
  "HGH",
  "KPV",
  "MOTS-C",
  "Retatrutide",
  "Epithalon",
  "GHK-CU",
];

const CATEGORY_LOOKUP = new Map<ProductCategoryId, ProductCategory>(
  productCategories.map((category) => [category.id, category])
);

const SEARCH_SUGGESTION_LIMIT = 6;

type QuickFilterId = "featured" | "labVerified" | "inStock";

type QuickFilter = {
  id: QuickFilterId;
  label: string;
  description: string;
};

type SearchSuggestion = {
  slug: string;
  name: string;
  subtitle: string;
  categories: string[];
  isFeatured: boolean;
};

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: "featured",
    label: "Featured",
    description: "Only show curated best sellers",
  },
  {
    id: "labVerified",
    label: "Lab Verified",
    description: "Requires a published Chromate report",
  },
  {
    id: "inStock",
    label: "In Stock",
    description: "At least one variant currently available",
  },
];

const productHasAvailableStock = (product: Product) =>
  product.variants.some((variant) =>
    typeof variant.stockQuantity === "number"
      ? variant.stockQuantity > 0
      : false
  );

const productHasTestResults = (product: Product) =>
  Boolean(
    product.testResultUrl ||
      product.variants.some((variant) => variant.testResultUrl)
  );

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

const getBaseUnitPrice = (variant: Variant) => {
  let bestUnitPrice: number | null = null;
  let bestQuantity = Infinity;

  for (const tier of variant.tiers) {
    const tierQuantity = parseQuantity(tier.quantity);
    const tierPrice = parsePrice(tier.price);
    if (!tierQuantity || !tierPrice) {
      continue;
    }

    const unitPrice = tierPrice / tierQuantity;
    if (tierQuantity < bestQuantity) {
      bestQuantity = tierQuantity;
      bestUnitPrice = unitPrice;
    } else if (tierQuantity === bestQuantity) {
      bestUnitPrice =
        bestUnitPrice === null ? unitPrice : Math.min(bestUnitPrice, unitPrice);
    }
  }

  return bestUnitPrice ?? 0;
};

type StoreClientProps = {
  products: Product[];
};

type CategoryTab = {
  id: "all" | "featured" | ProductCategoryId;
  label: string;
  description: string;
};

type ProductCardProps = {
  product: Product;
  molecules: MoleculeDefinition[];
  cartItems: CartItem[];
  onAddToCart: (payload: AddToCartPayload) => number;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
  showExpandToggle?: boolean;
  showModalLink?: boolean;
};

export function ProductCard({
  product,
  molecules,
  cartItems,
  onAddToCart,
  defaultExpanded = false,
  forceExpanded,
  showExpandToggle = true,
  showModalLink = true,
}: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const expanded = typeof forceExpanded === "boolean" ? forceExpanded : isExpanded;
  const buyingOptionsId = `product-${product.slug}-buying-options`;
  const descriptionId = `product-${product.slug}-description`;
  const getFirstValidTierIndex = (variant: Variant) =>
    variant.tiers.findIndex(
      (tier) => parseQuantity(tier.quantity) > 0 && parsePrice(tier.price) > 0
    );

  const getUnitsReservedForVariant = (variantLabel: string) =>
    cartItems.reduce((sum, item) => {
      if (item.variantLabel !== variantLabel) {
        return sum;
      }
      const matchesProductSlug = item.productSlug
        ? item.productSlug === product.slug
        : item.productName.toLowerCase() === product.name.toLowerCase();
      if (!matchesProductSlug) {
        return sum;
      }
      return sum + item.tierQuantity * item.count;
    }, 0);

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

  const [pendingAddCountByVariant, setPendingAddCountByVariant] = useState<
    Record<string, number>
  >(() => {
    const initial: Record<string, number> = {};
    for (const variant of product.variants) {
      initial[variant.label] = 1;
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

  const getPendingAddCount = (variantLabel: string) =>
    pendingAddCountByVariant[variantLabel] ?? 1;

  const handleSelectTier = (variantLabel: string, tierIndex: number) => {
    setSelectedTierIndexByVariant((prev) => ({
      ...prev,
      [variantLabel]: tierIndex,
    }));
  };

  const handleAdjustPendingAddCount = (
    variant: Variant,
    delta: number,
    tierQuantity: number,
    remainingStock: number | null
  ) => {
    setPendingAddCountByVariant((prev) => {
      const current = prev[variant.label] ?? 1;
      const maxPacks =
        remainingStock === null || tierQuantity === 0
          ? Number.POSITIVE_INFINITY
          : Math.max(Math.floor(remainingStock / tierQuantity), 0);
      if (delta > 0 && maxPacks === 0) {
        return prev;
      }
      const desired = Math.max(1, current + delta);
      const clamped =
        maxPacks === Number.POSITIVE_INFINITY
          ? desired
          : Math.min(desired, Math.max(maxPacks, 1));
      if (clamped === current) {
        return prev;
      }
      return {
        ...prev,
        [variant.label]: clamped,
      };
    });
  };

  const handleToggleExpansion = () => {
    if (typeof forceExpanded === "boolean") {
      return;
    }
    setIsExpanded((prev) => !prev);
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

    const variantStock =
      typeof variant.stockQuantity === "number" ? variant.stockQuantity : null;
    const reservedUnits = getUnitsReservedForVariant(variant.label);
    const remainingStock =
      variantStock === null
        ? null
        : Math.max(variantStock - reservedUnits, 0);

    if (
      remainingStock !== null &&
      (remainingStock === 0 || tierQuantity > remainingStock)
    ) {
      return;
    }

    const pricingTiers = variant.tiers
      .map((tier) => ({
        quantity: parseQuantity(tier.quantity),
        price: parsePrice(tier.price),
      }))
      .filter((tier) => tier.quantity > 0 && tier.price > 0)
      .sort((a, b) => a.quantity - b.quantity);

    if (pricingTiers.length === 0) {
      pricingTiers.push({
        quantity: tierQuantity,
        price: tierPrice,
      });
    }

    const tierPriceDisplay = selectedTier.price.startsWith("$")
      ? selectedTier.price
      : `$${selectedTier.price}`;

    const pendingCount = getPendingAddCount(variant.label);
    const addedCount = onAddToCart({
      productName: product.name,
      productSlug: product.slug,
      variantLabel: variant.label,
      tierQuantity,
      tierPrice,
      tierPriceDisplay,
      pricingTiers,
      maxVariantUnits:
        typeof variant.stockQuantity === "number"
          ? variant.stockQuantity
          : null,
      addCount: pendingCount,
    });

    if (addedCount > 0) {
      setPendingAddCountByVariant((prev) => ({
        ...prev,
        [variant.label]: 1,
      }));
    }
  };

  return (
    <article
      id={`product-${product.slug}`}
      className="flex h-full flex-col overflow-hidden rounded-3xl border border-purple-900/60 bg-gradient-to-b from-[#13001f] via-[#090012] to-black shadow-[0_20px_60px_rgba(45,0,95,0.45)]"
    >
      <div className="relative h-64 w-full border-b border-purple-900/40 bg-black/40 p-4">
        <MoleculeViewer
          productName={product.name}
          molecules={molecules}
          className="h-full rounded-2xl"
        />
      </div>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
          {product.detailedDescription ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                aria-expanded={isDescriptionExpanded}
                aria-controls={descriptionId}
                className="group w-full text-left"
              >
                <div className="flex items-start gap-2">
                  <p
                    className={`text-sm text-purple-100 transition-colors group-hover:text-purple-50 ${
                      isDescriptionExpanded ? "text-purple-200" : ""
                    }`}
                  >
                    {isDescriptionExpanded
                      ? product.detailedDescription
                      : product.researchFocus}
                  </p>
                  <svg
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 text-purple-300 transition-transform ${
                      isDescriptionExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>
              <p className="text-xs text-zinc-500">
                {isDescriptionExpanded
                  ? "Click to show brief description"
                  : "Click to expand for detailed description"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-purple-100">{product.researchFocus}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {product.categories.map((categoryId) => {
              const category = CATEGORY_LOOKUP.get(categoryId);
              if (!category) {
                return null;
              }
              return (
                <span
                  key={`${product.name}-${categoryId}`}
                  className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-purple-100"
                >
                  {category.label}
                </span>
              );
            })}
          </div>
          <p className="text-sm text-zinc-400">
            Select the dosage and volume tier that fits your research needs.
          </p>
          <div className="rounded-2xl border border-purple-900/40 bg-black/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
              Analytical Testing
            </p>
            {(() => {
              const variantTestLinks = product.variants.filter(
                (variant) => !!variant.testResultUrl
              );
              const hasVariantTests = variantTestLinks.length > 0;
              const defaultTestUrl =
                product.testResultUrl || variantTestLinks[0]?.testResultUrl;

              if (hasVariantTests) {
                return (
                  <div className="mt-3 space-y-3">
                    {variantTestLinks.map((variant) => (
                      <div
                        key={`${product.slug}-${variant.label}-test`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-900/30 bg-black/40 px-3 py-2"
                      >
                        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          {variant.label}
                        </span>
                        <a
                          href={variant.testResultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-100 underline decoration-dotted underline-offset-4 hover:text-white"
                        >
                          View certificate
                          <svg
                            className="h-3.5 w-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M7 17L17 7" />
                            <path d="M8 7h9v9" />
                          </svg>
                        </a>
                      </div>
                    ))}
                    {product.testResultUrl &&
                      !variantTestLinks.some(
                        (variant) =>
                          variant.testResultUrl === product.testResultUrl
                      ) && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-900/30 bg-black/40 px-3 py-2">
                          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                            General
                          </span>
                          <a
                            href={product.testResultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-purple-100 underline decoration-dotted underline-offset-4 hover:text-white"
                          >
                            View certificate
                            <svg
                              className="h-3.5 w-3.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M7 17L17 7" />
                              <path d="M8 7h9v9" />
                            </svg>
                          </a>
                        </div>
                      )}
                  </div>
                );
              }

              if (defaultTestUrl) {
                return (
                  <a
                    href={defaultTestUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-purple-100 underline decoration-dotted underline-offset-4 hover:text-white"
                  >
                    View certificate of analysis
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M7 17L17 7" />
                      <path d="M8 7h9v9" />
                    </svg>
                  </a>
                );
              }

              return (
                <p className="mt-2 text-sm text-zinc-400">
                  Test results coming soon.
                </p>
              );
            })()}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {showExpandToggle && (
              <button
                type="button"
                onClick={handleToggleExpansion}
                aria-expanded={expanded}
                aria-controls={buyingOptionsId}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:flex-none"
              >
                {expanded ? "Hide buying options" : "View buying options"}
              </button>
            )}
            {showModalLink && (
              <Link
                href={`/store/product/${product.slug}`}
                scroll={false}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-purple-500/40 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-purple-100 transition hover:border-purple-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:flex-none"
              >
                Open product detail
              </Link>
            )}
          </div>
          {expanded ? (
            <>
              <div
                id={buyingOptionsId}
                className="flex flex-1 flex-col gap-4"
              >
                {product.variants.map((variant) => {
                  const baseUnitPrice = getBaseUnitPrice(variant);
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
                  const variantStock =
                    typeof variant.stockQuantity === "number"
                      ? variant.stockQuantity
                      : null;
                  const reservedUnits = getUnitsReservedForVariant(variant.label);
                  const remainingStock =
                    variantStock === null
                      ? null
                      : Math.max(variantStock - reservedUnits, 0);
                  const isOutOfStock =
                    remainingStock !== null && remainingStock <= 0;
                  const insufficientSelection =
                    remainingStock !== null &&
                    selectedTierQuantity > remainingStock;
                  const addDisabled =
                    !selectedTier ||
                    selectedTierQuantity === 0 ||
                    selectedTierPrice === 0 ||
                    isOutOfStock ||
                    insufficientSelection;
                  const pendingAddCount = getPendingAddCount(variant.label);
                  const unitsPerPack = Math.max(selectedTierQuantity, 1);
                  const maxAddablePacks =
                    remainingStock === null || unitsPerPack === 0
                      ? Number.POSITIVE_INFINITY
                      : Math.max(Math.floor(remainingStock / unitsPerPack), 0);
                  const effectivePendingCount =
                    maxAddablePacks === Number.POSITIVE_INFINITY
                      ? pendingAddCount
                      : Math.min(
                          pendingAddCount,
                          Math.max(maxAddablePacks, 1)
                        );
                  const canIncreasePending =
                    maxAddablePacks === Number.POSITIVE_INFINITY
                      ? true
                      : effectivePendingCount < Math.max(maxAddablePacks, 1);

                  return (
                    <div
                      key={`${product.slug}-${variant.label}`}
                      className="flex flex-col gap-4 rounded-2xl border border-purple-900/40 bg-black/60 p-4"
                    >
                  {variant.mockupLabel ? (
                    <div className="flex justify-center rounded-2xl border border-purple-900/30 bg-gradient-to-b from-[#1b0924] via-[#0b0014] to-black p-4">
                      <ProductMockup
                        labelSrc={variant.mockupLabel}
                        productName={`${product.name} ${variant.label}`}
                        size="md"
                      />
                    </div>
                  ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-purple-100">
                        <span className="font-semibold uppercase tracking-wide text-purple-200">
                          {variant.label}
                        </span>
                        <span className="rounded-full border border-purple-500/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                          Pricing
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                        <span>
                          {variantStock === null
                            ? "Stock not set"
                            : remainingStock !== null
                            ? `${remainingStock} of ${variantStock} units available${
                                reservedUnits > 0
                                  ? ` (${reservedUnits} in cart)`
                                  : ""
                              }`
                            : "Stock not set"}
                        </span>
                        {isOutOfStock && (
                          <span className="font-semibold uppercase tracking-wide text-red-300">
                            Out of stock
                          </span>
                        )}
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
                          const perUnitPrice =
                            tierQuantity > 0 ? tierPrice / tierQuantity : 0;
                          const savingsPercent =
                            baseUnitPrice > 0 && perUnitPrice > 0
                              ? Math.round(
                                  ((baseUnitPrice - perUnitPrice) /
                                    baseUnitPrice) *
                                    100
                                )
                              : 0;

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
                              {savingsPercent > 0 && (
                                <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-green-300">
                                  Save {savingsPercent}%
                                </span>
                              )}
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
                        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                          <div className="inline-flex items-center gap-1 rounded-full border border-purple-500/60 bg-black/60 px-3 py-1">
                            <button
                              type="button"
                              className="h-7 w-7 rounded-full text-lg font-semibold text-purple-200 transition hover:text-white disabled:cursor-not-allowed disabled:text-purple-900/60"
                              onClick={() =>
                                handleAdjustPendingAddCount(
                                  variant,
                                  -1,
                                  unitsPerPack,
                                  remainingStock
                                )
                              }
                              disabled={effectivePendingCount <= 1}
                              aria-label={`Decrease ${variant.label} add quantity`}
                            >
                              -
                            </button>
                            <span className="px-2 text-sm font-semibold text-white">
                              {effectivePendingCount}
                            </span>
                            <button
                              type="button"
                              className="h-7 w-7 rounded-full text-lg font-semibold text-purple-200 transition hover:text-white disabled:cursor-not-allowed disabled:text-purple-900/60"
                              onClick={() =>
                                handleAdjustPendingAddCount(
                                  variant,
                                  1,
                                  unitsPerPack,
                                  remainingStock
                                )
                              }
                              disabled={!canIncreasePending || addDisabled}
                              aria-label={`Increase ${variant.label} add quantity`}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-purple-900/40"
                            onClick={() => handleAddVariantToCart(variant)}
                            disabled={addDisabled}
                          >
                            Add{" "}
                            {effectivePendingCount > 1
                              ? `${effectivePendingCount}× `
                              : ""}
                            {variant.label} to Cart
                          </button>
                        </div>
                        {insufficientSelection && remainingStock !== null && (
                          <p className="text-xs font-semibold text-amber-300">
                            Only {remainingStock} unit
                            {remainingStock === 1 ? "" : "s"} left for this
                            variant.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 text-xs text-zinc-500">
                Pricing shown for research use only. Contact us for bulk or
                specialized requests.
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-purple-900/40 bg-black/60 px-4 py-6 text-center text-sm text-zinc-300">
              Buying options are hidden. Use &quot;View buying options&quot; to
              choose a dosage and pricing tier.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

type FloatingCartButtonProps = {
  subtotal: number;
  totalUnits: number;
  cartItems: CartItem[];
  lineItemTotals: Record<string, number>;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onRemove: (key: string) => void;
};

export function FloatingCartButton({
  subtotal,
  totalUnits,
  cartItems,
  lineItemTotals,
  onIncrement,
  onDecrement,
  onRemove,
}: FloatingCartButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const variantUnitsInCart = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => {
      const variantKey =
        item.variantKey ??
        `${item.productSlug ?? item.productName}|${item.variantLabel}`;
      map.set(
        variantKey,
        (map.get(variantKey) ?? 0) + item.tierQuantity * item.count
      );
    });
    return map;
  }, [cartItems]);

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
        <div className="flex w-[320px] max-w-[90vw] flex-col rounded-3xl border border-purple-900/60 bg-black/95 p-5 shadow-[0_25px_80px_rgba(45,0,95,0.55)] backdrop-blur max-h-[calc(100vh-3rem)] overflow-hidden">
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
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-purple-900/40 bg-purple-500/10 px-4 py-3 text-xs">
                <div className="uppercase tracking-[0.3em] text-purple-200">
                  Subtotal
                </div>
                <div className="text-sm font-semibold text-white">
                  {formatCurrency(subtotal)}
                </div>
              </div>
              <div className="space-y-1 text-xs">
                {totalUnits > 0 && (
                  <div className="text-zinc-500">
                    {totalUnits} unit{totalUnits === 1 ? "" : "s"} selected
                  </div>
                )}
                {cartItems.length > 0 && (
                  <div className="text-[11px] text-purple-200">
                    Volume discounts apply automatically after 5 and 10 bottles
                    per product.
                  </div>
                )}
              </div>

              {cartItems.length > 0 ? (
                <ul className="space-y-4">
                  {cartItems.map((item) => {
                    const variantKeyForItem =
                      item.variantKey ??
                      `${item.productSlug ?? item.productName}|${item.variantLabel}`;
                    const variantLimit =
                      typeof item.maxVariantUnits === "number"
                        ? item.maxVariantUnits
                        : null;
                    const totalUnitsForVariant =
                      variantUnitsInCart.get(variantKeyForItem) ??
                      item.tierQuantity * item.count;
                    const incrementDisabled =
                      variantLimit !== null &&
                      totalUnitsForVariant + item.tierQuantity > variantLimit;
                    return (
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
                          {formatCurrency(
                            (lineItemTotals[item.key] ??
                              item.tierPrice * item.count) / item.count
                          )}{" "}
                          {lineItemTotals[item.key] != null &&
                          lineItemTotals[item.key] / item.count !==
                            item.tierPrice ? (
                            <span className="text-green-300">
                              (Discounted from {item.tierPriceDisplay})
                            </span>
                          ) : null}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {formatCurrency(
                            lineItemTotals[item.key] ??
                              item.tierPrice * item.count
                          )}
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
                              disabled={incrementDisabled}
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
                        {incrementDisabled && (
                          <p className="mt-2 text-[11px] font-semibold text-amber-300">
                            Maximum stock reached for this variant.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">
                  Browse the catalog and add peptides using the &quot;Add to
                  Cart&quot; button on each product.
                </p>
              )}
              <div className="rounded-2xl border border-purple-900/40 bg-purple-500/10 px-4 py-3 text-xs text-purple-200">
                Pricing displayed is for research use only. Reach out for bulk,
                custom, or specialty sourcing.
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/checkout");
                  }}
                  className="block w-full rounded-full bg-purple-600 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  Place Order (Pay Manually)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreClient({ products }: StoreClientProps) {
  const {
    cartItems,
    subtotal,
    totalUnits,
    lineItemTotals,
    addToCart,
    incrementItem,
    decrementItem,
    removeItem,
  } = useStorefront();
  const [activeCategory, setActiveCategory] = useState<CategoryTab["id"]>(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<
    Set<QuickFilterId>
  >(() => new Set());
  const searchBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const searchTrackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastTrackedSearchRef = useRef<string>("");
  const suggestionListId = "product-search-suggestions";
  const searchHelperId = "product-search-helper";

  useEffect(() => {
    return () => {
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
      if (searchTrackTimeoutRef.current) {
        clearTimeout(searchTrackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (searchTrackTimeoutRef.current) {
      clearTimeout(searchTrackTimeoutRef.current);
      searchTrackTimeoutRef.current = null;
    }

    const normalized = searchQuery.trim().toLowerCase();
    if (normalized.length < 3) {
      return;
    }

    searchTrackTimeoutRef.current = setTimeout(() => {
      if (lastTrackedSearchRef.current === normalized) {
        return;
      }
      lastTrackedSearchRef.current = normalized;
      tiktokTrack("Search", {
        ...createTikTokEventBase(),
        query: normalized,
        content_type: "product",
      });
    }, 650);

    return () => {
      if (searchTrackTimeoutRef.current) {
        clearTimeout(searchTrackTimeoutRef.current);
        searchTrackTimeoutRef.current = null;
      }
    };
  }, [searchQuery]);

  const categoryTabs = useMemo<CategoryTab[]>(() => {
    return [{
        id: "all",
        label: "All Products",
        description: "View the entire catalog sorted by popularity.",
      },
      {
        id: "featured",
        label: "Featured",
        description: "Our most requested products, curated for their popularity, reliability, and results.",
      },
      ...productCategories,

    ];
  }, []);

  const categoryLabelLookup = useMemo(() => {
    const map = new Map<ProductCategoryId, string>();
    productCategories.forEach((category) => map.set(category.id, category.label));
    return map;
  }, []);

  const activeCategoryMeta = useMemo(
    () => categoryTabs.find((tab) => tab.id === activeCategory),
    [categoryTabs, activeCategory]
  );

  const searchTokens = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    return normalized.length === 0
      ? []
      : normalized.split(/\s+/).filter(Boolean);
  }, [searchQuery]);

  const productSearchIndex = useMemo(() => {
    const index = new Map<string, string>();
    products.forEach((product) => {
      const categoryLabels = product.categories.map(
        (categoryId) => categoryLabelLookup.get(categoryId) ?? categoryId
      );
      const variantLabels = product.variants.map((variant) => variant.label);
      const searchableText = [
        product.name,
        product.slug,
        product.researchFocus,
        product.detailedDescription ?? "",
        ...categoryLabels,
        ...variantLabels,
      ]
        .join(" ")
        .toLowerCase();
      index.set(product.slug, searchableText);
    });
    return index;
  }, [products, categoryLabelLookup]);

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
      // Sort alphabetically by product name
      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (normalized.length === 0) {
      return [];
    }
    return sortedProducts
      .filter((product) => {
        const haystack = productSearchIndex.get(product.slug);
        return haystack ? haystack.includes(normalized) : false;
      })
      .slice(0, SEARCH_SUGGESTION_LIMIT)
      .map((product) => ({
        slug: product.slug,
        name: product.name,
        subtitle: product.researchFocus,
        categories: product.categories.map(
          (categoryId) => categoryLabelLookup.get(categoryId) ?? categoryId
        ),
        isFeatured: Boolean(product.isFeatured),
      }));
  }, [sortedProducts, searchQuery, productSearchIndex, categoryLabelLookup]);

  const showSuggestions = isSearchFocused && searchSuggestions.length > 0;

  const categoryMatchedProducts = useMemo(() => {
    if (activeCategory === "all") {
      return sortedProducts;
    }
    if (activeCategory === "featured") {
      return sortedProducts.filter((product) => product.isFeatured);
    }
    return sortedProducts.filter((product) =>
      product.categories.includes(activeCategory)
    );
  }, [sortedProducts, activeCategory]);

  const filteredProducts = useMemo(() => {
    return categoryMatchedProducts.filter((product) => {
      if (searchTokens.length > 0) {
        const haystack = productSearchIndex.get(product.slug);
        if (!haystack) {
          return false;
        }
        const matchesQuery = searchTokens.every((token) =>
          haystack.includes(token)
        );
        if (!matchesQuery) {
          return false;
        }
      }

      if (activeQuickFilters.has("featured") && !product.isFeatured) {
        return false;
      }

      if (activeQuickFilters.has("labVerified") && !productHasTestResults(product)) {
        return false;
      }

      if (activeQuickFilters.has("inStock") && !productHasAvailableStock(product)) {
        return false;
      }

      return true;
    });
  }, [
    categoryMatchedProducts,
    searchTokens,
    activeQuickFilters,
    productSearchIndex,
  ]);

  const handleSearchFocus = () => {
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
      searchBlurTimeoutRef.current = null;
    }
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    searchBlurTimeoutRef.current = setTimeout(() => {
      setIsSearchFocused(false);
    }, 120);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    setActiveCategory("all");
    setIsSearchFocused(false);
  };

  const toggleQuickFilter = (filterId: QuickFilterId) => {
    setActiveQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        next.add(filterId);
      }
      return next;
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setActiveQuickFilters(() => new Set());
  };

  const isSearchActive = searchTokens.length > 0;
  const isQuickFilterActive = activeQuickFilters.size > 0;
  const showClearFilters = isSearchActive || isQuickFilterActive;

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
              Research-grade peptides available in flexible volume tiers without the industry markup.
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.35em] text-white sm:text-sm">
              <div className="rounded-full border border-green-400/50 bg-green-500/10 px-4 py-2 font-semibold text-green-200 shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
                5+ Bottles = 20% Off
              </div>
              <div className="rounded-full border border-blue-400/50 bg-blue-500/10 px-4 py-2 font-semibold text-blue-200 shadow-[0_10px_30px_rgba(59,130,246,0.25)]">
                10+ Bottles = 30% Off
              </div>
              <div className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
                Free Shipping $300+
              </div>
              <div className="rounded-full border border-green-400/50 bg-green-500/10 px-4 py-2 font-semibold text-green-200 shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
                Ships within 48 hours
              </div>
              <span className="rounded-full border border-purple-500/40 bg-black/40 px-4 py-2 text-purple-100">
                Automatic savings on every peptide
              </span>
            </div>
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
          <div className="mx-auto max-w-6xl space-y-10">
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

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="relative mx-auto max-w-4xl">
                  <label htmlFor="product-search" className="sr-only">
                    Search products
                  </label>
                  <div className="flex items-center gap-3 rounded-full border border-purple-900/60 bg-black/60 px-5 py-3 text-sm text-white shadow-[0_12px_35px_rgba(45,0,95,0.4)] transition focus-within:border-purple-400 focus-within:bg-black/80 focus-within:shadow-[0_18px_45px_rgba(120,48,255,0.35)]">
                    <svg
                      className="h-5 w-5 text-purple-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                      id="product-search"
                      type="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions}
                      aria-controls={showSuggestions ? suggestionListId : undefined}
                      aria-describedby={searchHelperId}
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      placeholder="Search by peptide name, goal, or category..."
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                    />
                    {searchQuery.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-purple-200 transition hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {showSuggestions && (
                    <ul
                      id={suggestionListId}
                      role="listbox"
                      className="absolute left-0 right-0 z-30 mt-3 max-h-72 overflow-y-auto rounded-2xl border border-purple-900/60 bg-black/95 p-2 shadow-[0_25px_60px_rgba(45,0,95,0.65)]"
                    >
                      {searchSuggestions.map((suggestion) => (
                        <li key={suggestion.slug}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSuggestionSelect(suggestion);
                            }}
                            className="flex w-full flex-col rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-purple-500/10 focus:bg-purple-500/20 focus:outline-none"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">
                                {suggestion.name}
                              </span>
                              {suggestion.isFeatured && (
                                <span className="rounded-full border border-amber-200/60 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-amber-100">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-zinc-400">
                              {suggestion.subtitle}
                            </p>
                            <p className="mt-1 text-[0.55rem] uppercase tracking-[0.35em] text-purple-300">
                              {suggestion.categories.join(" • ")}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_FILTERS.map((filter) => {
                    const isActive = activeQuickFilters.has(filter.id);
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => toggleQuickFilter(filter.id)}
                        aria-pressed={isActive}
                        title={filter.description}
                        className={`rounded-full border px-4 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.3em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                          isActive
                            ? "border-purple-300 bg-purple-500/30 text-white shadow-[0_0_25px_rgba(120,48,255,0.35)]"
                            : "border-purple-900/50 bg-black/60 text-purple-200 hover:border-purple-400 hover:text-white"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-zinc-400" id={searchHelperId}>
                  Showing {filteredProducts.length} of {categoryMatchedProducts.length}{" "}
                  {activeCategory === "featured"
                    ? "featured peptides"
                    : activeCategory === "all"
                    ? "total peptides"
                    : `${
                        CATEGORY_LOOKUP.get(activeCategory as ProductCategoryId)
                          ?.label ?? "peptides"
                      }`}
                  .
                  {showClearFilters && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="font-semibold text-purple-200 underline decoration-dotted underline-offset-4 hover:text-white"
                      >
                        Clear search & filters
                      </button>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div
                  role="tablist"
                  aria-label="Product categories"
                  className="flex flex-wrap justify-center gap-3"
                >
                  {categoryTabs.map((tab) => {
                    const isActive = tab.id === activeCategory;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`rounded-full border px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                          isActive
                            ? "border-purple-400 bg-purple-500/30 text-white shadow-[0_0_30px_rgba(120,48,255,0.35)]"
                            : "border-purple-900/50 bg-black/60 text-purple-200 hover:border-purple-400 hover:text-white"
                        }`}
                        onClick={() => setActiveCategory(tab.id)}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-zinc-400">
                  {activeCategoryMeta?.description ??
                    "View the entire catalog of peptides sorted by popularity."}
                </p>
              </div>
              {filteredProducts.length > 0 ? (
                <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      molecules={productMolecules.get(product.name) ?? []}
                      cartItems={cartItems}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-purple-900/50 bg-black/60 p-8 text-center text-sm text-zinc-400">
                  No peptides match your search yet. Adjust filters or reach out for
                  sourcing support.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="px-6 sm:px-12 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <Disclaimer />
          </div>
        </section>
      </main>

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

