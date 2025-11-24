"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

const CATEGORY_LOOKUP = new Map<ProductCategoryId, ProductCategory>(
  productCategories.map((category) => [category.id, category])
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
  onAddToCart: (payload: AddToCartPayload) => void;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
  showExpandToggle?: boolean;
  showModalLink?: boolean;
};

export function ProductCard({
  product,
  molecules,
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

    onAddToCart({
      productName: product.name,
      variantLabel: variant.label,
      tierQuantity,
      tierPrice,
      tierPriceDisplay,
      pricingTiers,
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
            {product.testResultUrl ? (
              <a
                href={product.testResultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-purple-100 underline decoration-dotted underline-offset-4 hover:text-white"
              >
                View verified Chromate report
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
            ) : (
              <p className="mt-2 text-sm text-zinc-400">
                Test results coming soon.
              </p>
            )}
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
                  const addDisabled =
                    !selectedTier ||
                    selectedTierQuantity === 0 ||
                    selectedTierPrice === 0;

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
    "featured"
  );

  const categoryTabs = useMemo<CategoryTab[]>(() => {
    return [
      {
        id: "featured",
        label: "Featured",
        description: "Our most requested products, curated for their purity, reliability, and results.",
      },
      ...productCategories,
      {
        id: "all",
        label: "All Products",
        description: "View the entire catalog sorted by popularity.",
      },
    ];
  }, []);

  const activeCategoryMeta = useMemo(
    () => categoryTabs.find((tab) => tab.id === activeCategory),
    [categoryTabs, activeCategory]
  );

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

  const filteredProducts = useMemo(() => {
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
            <div className="space-y-8">
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
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-purple-900/50 bg-black/60 p-8 text-center text-sm text-zinc-400">
                  No peptides match this category yet. Check another tab or contact us
                  for sourcing.
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

