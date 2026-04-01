import "server-only";

import { and, ne, sql, type SQL } from "drizzle-orm";

import { db, orders } from "./db/index";

export type ShippingAddressParts = {
  street: string;
  zipCode: string;
  country: string;
};

export function normalizePhoneDigits (phone: string): string
{
  return phone.replace(/\D/g, "");
}

export function phoneUsableForReferralIdentity (phone: string): boolean
{
  return normalizePhoneDigits(phone).length >= 10;
}

export function normalizeShippingFingerprint (
  parts: ShippingAddressParts
): string | null
{
  const street = parts.street.trim();
  const zip = parts.zipCode.trim();
  const country = parts.country.trim();
  if (!street || !zip || !country) {
    return null;
  }
  const collapse = (value: string) =>
    value.toLowerCase().replace(/\s+/g, " ").trim();
  const zipNorm = collapse(zip).replace(/[\s-]/g, "");
  return `${collapse(street)}|${zipNorm}|${collapse(country)}`;
}

export function referralIdentityInputsReady (input: {
  customerPhone: string;
  shippingStreet: string;
  shippingZipCode: string;
  shippingCountry: string;
}): boolean
{
  return (
    phoneUsableForReferralIdentity(input.customerPhone) ||
    normalizeShippingFingerprint({
      street: input.shippingStreet,
      zipCode: input.shippingZipCode,
      country: input.shippingCountry,
    }) != null
  );
}

const REFERRAL_DISCOUNT_USED = sql`CAST(${orders.referralDiscount} AS NUMERIC) > 0`;

/**
 * True if a non-cancelled order already received a first-time referral discount
 * using the same phone (last 10 digits) or the same normalized ship-to address.
 */
export async function hasPriorReferralDiscountForIdentity (input: {
  customerPhone: string;
  shippingStreet: string;
  shippingZipCode: string;
  shippingCountry: string;
}): Promise<boolean>
{
  const digits = normalizePhoneDigits(input.customerPhone);
  const last10 = digits.length >= 10 ? digits.slice(-10) : null;
  const fingerprint = normalizeShippingFingerprint({
    street: input.shippingStreet,
    zipCode: input.shippingZipCode,
    country: input.shippingCountry,
  });

  const phoneClause =
    last10 != null
      ? sql`right(regexp_replace(${orders.customerPhone}, '\\D', '', 'g'), 10) = ${last10}`
      : null;

  const addressClause =
    fingerprint != null
      ? sql`(
          lower(regexp_replace(trim(${orders.shippingAddress}->>'street'), E'\\s+', ' ', 'g')) || '|' ||
          regexp_replace(
            regexp_replace(lower(trim(${orders.shippingAddress}->>'zipCode')), E'\\s+', '', 'g'),
            '-',
            '',
            'g'
          ) || '|' ||
          lower(regexp_replace(trim(${orders.shippingAddress}->>'country'), E'\\s+', ' ', 'g'))
        ) = ${fingerprint}`
      : null;

  if (!phoneClause && !addressClause) {
    return false;
  }

  let identityMatch: SQL;
  if (phoneClause && addressClause) {
    identityMatch = sql`(${phoneClause} OR ${addressClause})`;
  } else if (phoneClause) {
    identityMatch = phoneClause;
  } else {
    identityMatch = addressClause as SQL;
  }

  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(ne(orders.status, "CANCELLED"), REFERRAL_DISCOUNT_USED, identityMatch)
    )
    .limit(1);

  return row != null;
}

export const REFERRAL_IDENTITY_PREREQUISITE_MESSAGE =
  "Enter a valid phone number and full shipping address before applying a referral code.";

export const REFERRAL_IDENTITY_ALREADY_USED_MESSAGE =
  "A referral discount was already used for this phone number or shipping address.";
