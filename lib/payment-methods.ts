export type CheckoutPaymentMethod = "manual" | "card_link";

/**
 * Stripe / partner debit-credit card checkout.
 * When false, the option is hidden and new orders are forced to manual payment.
 */
export const CARD_LINK_PAYMENTS_ENABLED = true;

/**
 * Cash App Pay links on thank-you / confirmation email / checkout copy.
 * When false, Cash App is hidden from payment options and related messaging.
 */
export const CASH_APP_PAYMENTS_ENABLED = false;

const MANUAL_PAYMENT_METHODS: string[] = [
  "Zelle",
  ...(CASH_APP_PAYMENTS_ENABLED ? ["Cash App"] : []),
  "Venmo",
];

/**
 * Human-readable list of enabled manual payment methods, e.g.
 * "Zelle, Cash App, or Venmo" / "Zelle or Venmo".
 */
export function listManualPaymentMethods (
  conjunction: "or" | "and" = "or"
): string
{
  const methods = [...MANUAL_PAYMENT_METHODS];
  if (methods.length === 1) {
    return methods[0];
  }
  if (methods.length === 2) {
    return `${methods[0]} ${conjunction} ${methods[1]}`;
  }
  return `${methods.slice(0, -1).join(", ")}, ${conjunction} ${methods[methods.length - 1]}`;
}

/** Slash-separated list for compact copy, e.g. "Zelle / Venmo". */
export function listManualPaymentMethodsSlash (): string
{
  return MANUAL_PAYMENT_METHODS.join(" / ");
}

export function resolveCheckoutPaymentMethod (
  paymentMethod?: CheckoutPaymentMethod | string | null
): CheckoutPaymentMethod
{
  if (CARD_LINK_PAYMENTS_ENABLED && paymentMethod === "card_link") {
    return "card_link";
  }

  return "manual";
}
