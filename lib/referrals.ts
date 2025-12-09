import "server-only";

import { randomUUID } from "crypto";
import
{
  and,
  eq,
  gte,
  or,
  sql,
} from "drizzle-orm";

import { calculateVolumePricing } from "./cart-pricing";
import
{
  db,
  orders,
  referralAttributions,
  referralCodes,
  referralPartners,
} from "./db/index";
import type { Order } from "./orders";
import type { CartItem } from "@/components/store/StorefrontContext";
import type
{
  AppliedReferralResult,
  ReferralDashboardData,
  ReferralDiscountMode,
  ReferralPartnerSummary,
  ReferralCodeSummary,
} from "@/types/referrals";

const REFERRAL_CODE_CLEANUP = /[^A-Z0-9]/g;

type ReferralPartnerRow = typeof referralPartners.$inferSelect;
type ReferralCodeRow = typeof referralCodes.$inferSelect;
type ReferralAttributionRow = typeof referralAttributions.$inferSelect;

type ReferralCodeWithPartner = {
  code: ReferralCodeRow;
  partner: ReferralPartnerRow;
};

type AttributionJoinedRow = {
  attribution: ReferralAttributionRow;
  partner: ReferralPartnerRow;
  code?: ReferralCodeRow | null;
};

type PendingAttributionInput = {
  partnerId: string;
  partnerName: string;
  codeId?: string | null;
  codeValue?: string | null;
  customerEmail: string;
  customerName: string;
  customerUserId?: string | null;
  discountAmount: number;
};

export type ReferralOrderContext = {
  referralPartnerId: string;
  referralPartnerName?: string | null;
  referralCodeId?: string | null;
  referralCodeValue?: string | null;
  referralDiscount: number;
  attributionId?: string | null;
  existingAttribution?: AttributionJoinedRow | null;
  pendingAttribution?: PendingAttributionInput | null;
} | null;

function normalizeEmail (value: string): string
{
  return value.trim().toLowerCase();
}

export function normalizeReferralCode (value: string): string
{
  return value.trim().toUpperCase().replace(REFERRAL_CODE_CLEANUP, "");
}

function toCurrency (value: number): number
{
  return Math.round(value * 100) / 100;
}

function parseNumeric (value: string | number | null): number
{
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getCodeWithPartner (
  codeValue: string
): Promise<ReferralCodeWithPartner | null>
{
  const normalized = normalizeReferralCode(codeValue);
  if (!normalized) {
    return null;
  }

  const [record] = await db
    .select({
      code: referralCodes,
      partner: referralPartners,
    })
    .from(referralCodes)
    .innerJoin(
      referralPartners,
      eq(referralCodes.partnerId, referralPartners.id)
    )
    .where(eq(referralCodes.code, normalized))
    .limit(1);

  return record ?? null;
}

async function findAttributionForCustomer (params: {
  email?: string | null;
  userId?: string | null;
}): Promise<AttributionJoinedRow | null>
{
  const { email, userId } = params;
  const conditions = [];
  if (email) {
    conditions.push(eq(referralAttributions.customerEmail, email));
  }
  if (userId) {
    conditions.push(eq(referralAttributions.customerUserId, userId));
  }
  if (conditions.length === 0) {
    return null;
  }
  const whereClause =
    conditions.length === 1 ? conditions[0] : or(...conditions);

  const [row] = await db
    .select({
      attribution: referralAttributions,
      partner: referralPartners,
      code: referralCodes,
    })
    .from(referralAttributions)
    .innerJoin(
      referralPartners,
      eq(referralAttributions.partnerId, referralPartners.id)
    )
    .leftJoin(
      referralCodes,
      eq(referralAttributions.codeId, referralCodes.id)
    )
    .where(whereClause)
    .limit(1);

  return row ?? null;
}

function validateReferralCodeRecord (
  record: ReferralCodeWithPartner
): string | null
{
  if (!record.partner.active) {
    return "This partner is currently inactive.";
  }
  if (!record.code.active) {
    return "This referral code is inactive.";
  }
  const now = new Date();
  if (record.code.startsAt && record.code.startsAt > now) {
    return "This referral code is not active yet.";
  }
  if (record.code.expiresAt && record.code.expiresAt < now) {
    return "This referral code has expired.";
  }
  if (
    record.code.maxTotalRedemptions != null &&
    record.code.currentRedemptions >= record.code.maxTotalRedemptions
  ) {
    return "This referral code has reached its usage limit.";
  }
  if (record.code.discountValue == null) {
    return "This referral code is missing a discount value.";
  }
  const discountValue = parseNumeric(record.code.discountValue);
  if (discountValue <= 0) {
    return "This referral code does not provide a discount.";
  }
  return null;
}

function calculateReferralDiscountAmount (
  subtotal: number,
  code: ReferralCodeRow
): number
{
  const value = parseNumeric(code.discountValue);
  if (value <= 0 || subtotal <= 0) {
    return 0;
  }
  if ((code.discountType as ReferralDiscountMode) === "fixed") {
    return toCurrency(Math.min(subtotal, value));
  }
  const percent = Math.max(0, Math.min(100, value));
  return toCurrency(Math.min(subtotal, (subtotal * percent) / 100));
}

export async function evaluateReferralCodeForCheckout (
  params: {
    code: string;
    customerEmail: string;
    cartItems: CartItem[];
    cartSubtotal: number;
    userId?: string | null;
  }
): Promise<AppliedReferralResult>
{
  const normalizedEmail = params.customerEmail
    ? normalizeEmail(params.customerEmail)
    : "";
  if (!normalizedEmail) {
    return {
      status: "error",
      message: "Enter your email before applying a referral code.",
    };
  }

  const normalizedCode = normalizeReferralCode(params.code);
  if (!normalizedCode) {
    return { status: "error", message: "Enter a referral code to continue." };
  }

  const { subtotal } = calculateVolumePricing(params.cartItems);
  if (Math.abs(subtotal - params.cartSubtotal) > 0.01) {
    return {
      status: "error",
      message:
        "Your cart changed while applying this code. Refresh or try again.",
    };
  }

  const existingAttribution = await findAttributionForCustomer({
    email: normalizedEmail,
    userId: params.userId,
  });
  if (existingAttribution) {
    return {
      status: "already-attributed",
      partnerId: existingAttribution.partner.id,
      partnerName: existingAttribution.partner.name,
      attributionId: existingAttribution.attribution.id,
      message: `This customer is already assigned to ${existingAttribution.partner.name}.`,
    };
  }

  const codeRecord = await getCodeWithPartner(normalizedCode);
  if (!codeRecord) {
    return { status: "error", message: "We couldn't find that referral code." };
  }
  const validationError = validateReferralCodeRecord(codeRecord);
  if (validationError) {
    return { status: "error", message: validationError };
  }

  const discountAmount = calculateReferralDiscountAmount(
    subtotal,
    codeRecord.code
  );
  if (discountAmount <= 0) {
    return {
      status: "error",
      message: "This referral code doesn't apply to the current cart.",
    };
  }

  return {
    status: "applied",
    code: codeRecord.code.code,
    partnerId: codeRecord.partner.id,
    partnerName: codeRecord.partner.name,
    discountAmount,
    discountType: (codeRecord.code.discountType ??
      "percent") as ReferralDiscountMode,
    discountValue: parseNumeric(codeRecord.code.discountValue),
    message: `Referral code applied. You'll save $${discountAmount.toFixed(2)}.`,
  };
}

export async function resolveReferralForOrder (
  params: {
    referralCode?: string;
    customerEmail: string;
    customerName: string;
    userId?: string | null;
    subtotal: number;
  }
): Promise<ReferralOrderContext>
{
  const normalizedEmail = normalizeEmail(params.customerEmail);
  const existingAttribution = await findAttributionForCustomer({
    email: normalizedEmail,
    userId: params.userId,
  });

  if (existingAttribution) {
    return {
      referralPartnerId: existingAttribution.partner.id,
      referralPartnerName: existingAttribution.partner.name,
      referralCodeId: existingAttribution.code?.id ?? null,
      referralCodeValue: existingAttribution.code?.code ?? null,
      referralDiscount: 0,
      attributionId: existingAttribution.attribution.id,
      existingAttribution,
      pendingAttribution: null,
    };
  }

  if (!params.referralCode) {
    return null;
  }

  const normalizedCode = normalizeReferralCode(params.referralCode);
  if (!normalizedCode) {
    throw new Error("Enter a valid referral code.");
  }

  const codeRecord = await getCodeWithPartner(normalizedCode);
  if (!codeRecord) {
    throw new Error("Referral code not found.");
  }
  const validationError = validateReferralCodeRecord(codeRecord);
  if (validationError) {
    throw new Error(validationError);
  }

  const discountAmount = calculateReferralDiscountAmount(
    params.subtotal,
    codeRecord.code
  );
  if (discountAmount <= 0) {
    throw new Error("This referral code does not apply to the current cart.");
  }

  return {
    referralPartnerId: codeRecord.partner.id,
    referralPartnerName: codeRecord.partner.name,
    referralCodeId: codeRecord.code.id,
    referralCodeValue: codeRecord.code.code,
    referralDiscount: discountAmount,
    attributionId: null,
    existingAttribution: null,
    pendingAttribution: {
      partnerId: codeRecord.partner.id,
      partnerName: codeRecord.partner.name,
      codeId: codeRecord.code.id,
      codeValue: codeRecord.code.code,
      customerEmail: normalizedEmail,
      customerName: params.customerName,
      customerUserId: params.userId ?? undefined,
      discountAmount,
    },
  };
}

export async function finalizeReferralForOrder (
  order: Order,
  context: ReferralOrderContext
): Promise<void>
{
  if (!context) {
    return;
  }

  const orderDate = new Date(order.createdAt);
  const now = new Date();

  if (context.pendingAttribution) {
    const attributionId = randomUUID();
    const lifetimeRevenue = order.subtotal;
    await db.insert(referralAttributions).values({
      id: attributionId,
      partnerId: context.pendingAttribution.partnerId,
      codeId: context.pendingAttribution.codeId ?? null,
      customerEmail: context.pendingAttribution.customerEmail,
      customerUserId: context.pendingAttribution.customerUserId ?? null,
      customerName: context.pendingAttribution.customerName,
      firstOrderId: order.id,
      firstOrderNumber: order.orderNumber,
      firstOrderDiscount: context.pendingAttribution.discountAmount.toString(),
      lifetimeRevenue: lifetimeRevenue.toString(),
      totalOrders: 1,
      lastOrderId: order.id,
      lastOrderNumber: order.orderNumber,
      lastOrderAt: orderDate,
      createdAt: now,
      updatedAt: now,
    });

    await db
      .update(orders)
      .set({
        referralAttributionId: attributionId,
        referralPartnerName:
          context.referralPartnerName ?? context.pendingAttribution.partnerName,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    if (context.referralCodeId) {
      await db
        .update(referralCodes)
        .set({
          currentRedemptions: sql`${referralCodes.currentRedemptions} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(referralCodes.id, context.referralCodeId));
    }

    return;
  }

  if (context.existingAttribution && context.attributionId) {
    const currentLifetime = parseNumeric(
      context.existingAttribution.attribution.lifetimeRevenue
    );
    const currentOrders = context.existingAttribution.attribution.totalOrders;
    const nextLifetime = toCurrency(currentLifetime + order.subtotal);
    const nextOrders = currentOrders + 1;

    await db
      .update(referralAttributions)
      .set({
        lifetimeRevenue: nextLifetime.toString(),
        totalOrders: nextOrders,
        lastOrderId: order.id,
        lastOrderNumber: order.orderNumber,
        lastOrderAt: orderDate,
        updatedAt: now,
      })
      .where(eq(referralAttributions.id, context.attributionId));

    if (!order.referralAttributionId) {
      await db
        .update(orders)
        .set({
          referralAttributionId: context.attributionId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    }
  }
}

export async function createReferralPartner (input: {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  defaultDiscountType: ReferralDiscountMode;
  defaultDiscountValue: number;
}): Promise<void>
{
  const id = randomUUID();
  const now = new Date();
  await db.insert(referralPartners).values({
    id,
    name: input.name.trim(),
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim().toLowerCase() || null,
    contactPhone: input.contactPhone?.trim() || null,
    notes: input.notes?.trim() || null,
    defaultDiscountType: input.defaultDiscountType,
    defaultDiscountValue: toCurrency(
      Math.max(0, input.defaultDiscountValue)
    ).toString(),
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateReferralPartnerStatus (
  partnerId: string,
  active: boolean
): Promise<void>
{
  await db
    .update(referralPartners)
    .set({ active, updatedAt: new Date() })
    .where(eq(referralPartners.id, partnerId));
}

export async function deleteReferralPartner (partnerId: string): Promise<void>
{
  await db.delete(referralPartners).where(eq(referralPartners.id, partnerId));
}

export async function createReferralCode (input: {
  partnerId: string;
  code: string;
  description?: string | null;
  discountType: ReferralDiscountMode;
  discountValue: number;
  maxTotalRedemptions?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}): Promise<void>
{
  const normalizedCode = normalizeReferralCode(input.code);
  if (!normalizedCode) {
    throw new Error("Referral code must include letters or numbers.");
  }

  const existing = await db
    .select({ id: referralCodes.id })
    .from(referralCodes)
    .where(eq(referralCodes.code, normalizedCode))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("That referral code is already in use.");
  }

  const discountValue = toCurrency(Math.max(0, input.discountValue));
  if (discountValue <= 0) {
    throw new Error("Discount value must be greater than zero.");
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(referralCodes).values({
    id,
    partnerId: input.partnerId,
    code: normalizedCode,
    description: input.description?.trim() || null,
    discountType: input.discountType,
    discountValue: discountValue.toString(),
    maxRedemptionsPerCustomer: 1,
    maxTotalRedemptions:
      typeof input.maxTotalRedemptions === "number"
        ? Math.max(1, Math.trunc(input.maxTotalRedemptions))
        : null,
    currentRedemptions: 0,
    startsAt: input.startsAt ?? null,
    expiresAt: input.expiresAt ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateReferralCodeStatus (
  codeId: string,
  active: boolean
): Promise<void>
{
  await db
    .update(referralCodes)
    .set({ active, updatedAt: new Date() })
    .where(eq(referralCodes.id, codeId));
}

export async function deleteReferralCode (codeId: string): Promise<void>
{
  await db.delete(referralCodes).where(eq(referralCodes.id, codeId));
}

function mapCodeToSummary (code: ReferralCodeRow): ReferralCodeSummary
{
  return {
    id: code.id,
    partnerId: code.partnerId,
    code: code.code,
    description: code.description,
    discountType: (code.discountType ??
      "percent") as ReferralDiscountMode,
    discountValue: parseNumeric(code.discountValue),
    maxRedemptionsPerCustomer: code.maxRedemptionsPerCustomer,
    maxTotalRedemptions: code.maxTotalRedemptions ?? null,
    currentRedemptions: code.currentRedemptions,
    startsAt: code.startsAt ? code.startsAt.toISOString() : null,
    expiresAt: code.expiresAt ? code.expiresAt.toISOString() : null,
    active: code.active,
    createdAt: code.createdAt.toISOString(),
    updatedAt: code.updatedAt.toISOString(),
  };
}

export async function getReferralDashboardData ():
  Promise<ReferralDashboardData>
{
  const [partnerRows, codeRows, attributionRows] = await Promise.all([
    db.select().from(referralPartners),
    db.select().from(referralCodes),
    db.select().from(referralAttributions),
  ]);

  const partnerMap = new Map<string, ReferralPartnerSummary>();
  for (const partner of partnerRows) {
    partnerMap.set(partner.id, {
      id: partner.id,
      name: partner.name,
      contactName: partner.contactName,
      contactEmail: partner.contactEmail,
      contactPhone: partner.contactPhone,
      notes: partner.notes,
      defaultDiscountType: (partner.defaultDiscountType ??
        "percent") as ReferralDiscountMode,
      defaultDiscountValue: parseNumeric(partner.defaultDiscountValue),
      active: partner.active,
      createdAt: partner.createdAt.toISOString(),
      updatedAt: partner.updatedAt.toISOString(),
      totalCustomers: 0,
      totalRevenue: 0,
      lastOrderAt: null,
      codes: [],
    });
  }

  for (const code of codeRows) {
    const summary = partnerMap.get(code.partnerId);
    if (!summary) {
      continue;
    }
    summary.codes.push(mapCodeToSummary(code));
  }

  let totalCustomers = 0;
  let lifetimeRevenue = 0;
  for (const attribution of attributionRows) {
    const summary = partnerMap.get(attribution.partnerId);
    if (!summary) {
      continue;
    }
    const revenue = parseNumeric(attribution.lifetimeRevenue);
    lifetimeRevenue += revenue;
    summary.totalCustomers += 1;
    summary.totalRevenue += revenue;
    totalCustomers += 1;
    if (
      attribution.lastOrderAt &&
      (!summary.lastOrderAt ||
        summary.lastOrderAt < attribution.lastOrderAt.toISOString())
    ) {
      summary.lastOrderAt = attribution.lastOrderAt.toISOString();
    }
  }

  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const recentOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, cutoff),
        sql`${orders.referralPartnerId} IS NOT NULL`
      )
    );

  const partners = Array.from(partnerMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const activeCodes = codeRows.filter((code) => code.active).length;
  const activePartners = partnerRows.filter((partner) => partner.active).length;

  return {
    totals: {
      partners: partners.length,
      activePartners,
      activeCodes,
      totalCustomers,
      attributedOrdersLast30Days: recentOrders.length,
      lifetimeRevenue: toCurrency(lifetimeRevenue),
    },
    partners,
  };
}

