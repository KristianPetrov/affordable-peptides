const DEFAULT_CARD_CHECKOUT_PAY_BASE = "https://www.rootedinhealing.care";

/**
 * Card checkout is hosted on the Rooted in Healing site.
 * Override with CARD_CHECKOUT_PAY_BASE_URL (no trailing slash).
 */
export function buildCardCheckoutPayUrl (orderId: string): string
{
  const raw =
    process.env.CARD_CHECKOUT_PAY_BASE_URL?.trim() ||
    DEFAULT_CARD_CHECKOUT_PAY_BASE;
  const base = raw.replace(/\/$/, "");
  return `${base}/pay/${encodeURIComponent(orderId)}`;
}
