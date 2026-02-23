const FREE_SHIPPING_THRESHOLD = 300;
const FLAT_RATE_SHIPPING = 10;

type ShippingOptions = {
  /** Force the flat-rate shipping charge even if the order would normally qualify for free shipping. */
  forceFlatRate?: boolean;
};

/**
 * Calculate shipping cost based on order subtotal
 * - Free shipping on orders over $300 (unless forceFlatRate is true)
 * - $10 flat shipping otherwise
 */
export function calculateShippingCost (
  subtotal: number,
  options?: ShippingOptions
): number
{
  if (options?.forceFlatRate) {
    return FLAT_RATE_SHIPPING;
  }
  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  return FLAT_RATE_SHIPPING;
}

/**
 * Calculate total order amount including shipping
 */
export function calculateTotalWithShipping (
  subtotal: number,
  options?: ShippingOptions
): number
{
  return subtotal + calculateShippingCost(subtotal, options);
}

export const SHIPPING_CONSTANTS = {
  FREE_SHIPPING_THRESHOLD,
  FLAT_RATE_SHIPPING,
};


