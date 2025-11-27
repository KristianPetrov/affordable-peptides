/**
 * Calculate shipping cost based on order subtotal
 * - Free shipping on orders over $300
 * - $10 flat shipping otherwise
 */
export function calculateShippingCost(subtotal: number): number {
  if (subtotal >= 300) {
    return 0;
  }
  return 10;
}

/**
 * Calculate total order amount including shipping
 */
export function calculateTotalWithShipping(subtotal: number): number {
  return subtotal + calculateShippingCost(subtotal);
}


