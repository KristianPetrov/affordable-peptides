export type CheckoutPaymentMethod = "manual" | "card_link";

/**
 * Stripe / partner debit-credit card checkout.
 * When false, the option is hidden and new orders are forced to manual payment.
 */
export const CARD_LINK_PAYMENTS_ENABLED = true;

export function resolveCheckoutPaymentMethod (
  paymentMethod?: CheckoutPaymentMethod | string | null
): CheckoutPaymentMethod
{
  if (CARD_LINK_PAYMENTS_ENABLED && paymentMethod === "card_link") {
    return "card_link";
  }

  return "manual";
}
