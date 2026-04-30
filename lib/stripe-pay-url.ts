const DEFAULT_STRIPE_CHECKOUT_PAY_BASE = "https://www.rootedinhealing.care";

/**
 * Secure card checkout is hosted on the Rooted in Healing site.
 * Override with STRIPE_CHECKOUT_PAY_BASE_URL (no trailing slash).
 */
export function buildStripeCheckoutPayUrl (orderId: string): string
{
  const raw =
    process.env.STRIPE_CHECKOUT_PAY_BASE_URL?.trim() ||
    DEFAULT_STRIPE_CHECKOUT_PAY_BASE;
  const base = raw.replace(/\/$/, "");
  return `${base}/pay/${encodeURIComponent(orderId)}`;
}
