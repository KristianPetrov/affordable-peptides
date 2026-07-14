import type { CartLikeItem, PricingTier } from "./cart-pricing";
import {
  getProductBySlug,
  getProductSlugByName,
  type Tier,
} from "./products";

type CatalogCartItem = CartLikeItem & {
  productSlug?: string;
  variantKey?: string;
};

function parseCatalogNumber(value: string): number {
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTiers(tiers: Tier[]): PricingTier[] {
  return tiers
    .map((tier) => ({
      quantity: parseCatalogNumber(tier.quantity),
      price: parseCatalogNumber(tier.price),
    }))
    .filter((tier) => tier.quantity > 0 && tier.price > 0);
}

/** Replace client-persisted prices with the current catalog prices. */
export function resolveCurrentCatalogItem<T extends CatalogCartItem>(
  item: T
): T | null {
  const productSlug =
    item.productSlug ?? getProductSlugByName(item.productName);
  if (!productSlug) {
    return null;
  }

  const product = getProductBySlug(productSlug);
  const variant = product?.variants.find(
    (candidate) => candidate.label === item.variantLabel
  );
  if (!product || !variant) {
    return null;
  }

  const pricingTiers = normalizeTiers(variant.tiers);
  const selectedTier = pricingTiers.find(
    (tier) => tier.quantity === item.tierQuantity
  );
  if (!selectedTier) {
    return null;
  }

  const variantKey = `${product.slug}|${variant.label}`;
  return {
    ...item,
    productName: product.name,
    productSlug: product.slug,
    variantKey,
    key: `${variantKey}|${selectedTier.quantity}`,
    tierPrice: selectedTier.price,
    tierPriceDisplay: `$${selectedTier.price}`,
    pricingTiers,
  };
}

export function resolveCurrentCatalogItems<T extends CatalogCartItem>(
  items: T[]
): T[] {
  return items
    .map(resolveCurrentCatalogItem)
    .filter((item): item is T => item !== null);
}
