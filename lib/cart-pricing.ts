export type PricingTier = {
  quantity: number;
  price: number;
};

export type CartLikeItem = {
  key: string;
  productName: string;
  variantLabel: string;
  tierQuantity: number;
  tierPrice: number;
  tierPriceDisplay?: string;
  count: number;
  pricingTiers?: PricingTier[];
};

export type VolumePricingSummary = {
  subtotal: number;
  lineItemTotals: Record<string, number>;
};

type UnitPricing = {
  single: number;
  five: number;
  ten: number;
};

const FALLBACK_PRICE = 0;

function deriveUnitPricing(
  items: CartLikeItem[],
  tiers?: PricingTier[]
): UnitPricing {
  const sanitizedTiers =
    tiers?.filter((tier) => tier.quantity > 0 && tier.price > 0) ?? [];

  const getTierPrice = (quantity: number): number | undefined => {
    const match = sanitizedTiers.find((tier) => tier.quantity === quantity);
    if (!match) {
      return undefined;
    }
    return match.price / match.quantity;
  };

  const fallbackUnit = items.reduce<number | undefined>((acc, item) => {
    const perUnit = item.tierPrice / Math.max(item.tierQuantity, 1);
    if (!acc) {
      return perUnit;
    }
    return Math.min(acc, perUnit);
  }, undefined);

  const single = getTierPrice(1) ?? fallbackUnit ?? FALLBACK_PRICE;
  const five = getTierPrice(5) ?? single;
  const ten = getTierPrice(10) ?? five;

  return { single, five, ten };
}

export function calculateVolumePricing(
  items: CartLikeItem[]
): VolumePricingSummary {
  if (items.length === 0) {
    return { subtotal: 0, lineItemTotals: {} };
  }

  const byVariant = new Map<string, CartLikeItem[]>();
  for (const item of items) {
    const key = `${item.productName}|${item.variantLabel}`;
    const existing = byVariant.get(key);
    if (existing) {
      existing.push(item);
    } else {
      byVariant.set(key, [item]);
    }
  }

  const lineItemTotals: Record<string, number> = {};
  let subtotal = 0;

  byVariant.forEach((variantItems) => {
    if (variantItems.length === 0) {
      return;
    }

    const unitPricing = deriveUnitPricing(
      variantItems,
      variantItems[0].pricingTiers
    );

    const packItems = variantItems.filter((item) => item.tierQuantity > 1);
    const singleItems = variantItems.filter((item) => item.tierQuantity === 1);

    let consumedUnits = 0;

    for (const packItem of packItems) {
      const packTotal = packItem.tierPrice * packItem.count;
      lineItemTotals[packItem.key] = packTotal;
      subtotal += packTotal;
      consumedUnits += packItem.tierQuantity * packItem.count;
    }

    for (const singleItem of singleItems) {
      const units = singleItem.count * singleItem.tierQuantity;
      let itemTotal = 0;

      for (let i = 0; i < units; i++) {
        consumedUnits += 1;
        if (consumedUnits > 10) {
          itemTotal += unitPricing.ten;
        } else if (consumedUnits > 5) {
          itemTotal += unitPricing.five;
        } else {
          itemTotal += unitPricing.single;
        }
      }

      lineItemTotals[singleItem.key] = itemTotal;
      subtotal += itemTotal;
    }
  });

  return { subtotal, lineItemTotals };
}

