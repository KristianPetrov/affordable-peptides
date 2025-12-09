"use server";

import { revalidatePath } from "next/cache";

import type { CartItem } from "@/components/store/StorefrontContext";
import { auth } from "@/lib/auth";
import
{
  createReferralCode,
  createReferralPartner,
  deleteReferralCode,
  deleteReferralPartner,
  evaluateReferralCodeForCheckout,
  normalizeReferralCode,
  updateReferralCodeStatus,
  updateReferralPartnerStatus,
} from "@/lib/referrals";
import type { AppliedReferralResult, ReferralDiscountMode } from "@/types/referrals";

export async function applyReferralCodeAction (input: {
  code: string;
  customerEmail: string;
  cartItems: CartItem[];
  cartSubtotal: number;
}): Promise<AppliedReferralResult>
{
  try {
    const session = await auth().catch(() => null);
    return await evaluateReferralCodeForCheckout({
      ...input,
      userId: session?.user?.id,
    });
  } catch (error: unknown) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "We couldn't verify that referral code.",
    };
  }
}

export async function createReferralPartnerAction (
  formData: FormData
): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Partner name is required.");
  }

  const discountType = (formData.get("defaultDiscountType") ??
    "percent") as ReferralDiscountMode;
  const discountValue = Number(formData.get("defaultDiscountValue") ?? 0);

  await createReferralPartner({
    name,
    contactName: (formData.get("contactName") as string | null) ?? null,
    contactEmail: (formData.get("contactEmail") as string | null) ?? null,
    contactPhone: (formData.get("contactPhone") as string | null) ?? null,
    notes: (formData.get("notes") as string | null) ?? null,
    defaultDiscountType: discountType,
    defaultDiscountValue: Number.isFinite(discountValue) ? discountValue : 0,
  });

  revalidatePath("/admin");
}

export async function createReferralCodeAction (
  formData: FormData
): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const partnerId = String(formData.get("partnerId") ?? "").trim();
  if (!partnerId) {
    throw new Error("Select a partner for this referral code.");
  }

  const rawCode = String(formData.get("code") ?? "");
  const normalizedCode = normalizeReferralCode(rawCode);
  if (!normalizedCode) {
    throw new Error("Referral code must contain letters or numbers.");
  }

  const discountType = (formData.get("discountType") ??
    "percent") as ReferralDiscountMode;
  const discountValue = Number(formData.get("discountValue") ?? 0);

  const maxTotalRedemptions = formData.get("maxTotalRedemptions");
  const startsAtValue = formData.get("startsAt");
  const expiresAtValue = formData.get("expiresAt");

  const startsAt =
    typeof startsAtValue === "string" && startsAtValue
      ? new Date(startsAtValue)
      : null;
  const expiresAt =
    typeof expiresAtValue === "string" && expiresAtValue
      ? new Date(expiresAtValue)
      : null;

  if (startsAt && expiresAt && startsAt > expiresAt) {
    throw new Error("Start date must be before the expiration date.");
  }

  await createReferralCode({
    partnerId,
    code: normalizedCode,
    description: (formData.get("description") as string | null) ?? null,
    discountType,
    discountValue,
    maxTotalRedemptions:
      typeof maxTotalRedemptions === "string" && maxTotalRedemptions
        ? Number(maxTotalRedemptions)
        : null,
    startsAt,
    expiresAt,
  });

  revalidatePath("/admin");
}

export async function toggleReferralPartnerStatusAction (
  formData: FormData
): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "active");
  if (!partnerId) {
    throw new Error("Missing partner id.");
  }

  await updateReferralPartnerStatus(partnerId, nextStatus === "active");
  revalidatePath("/admin");
}

export async function toggleReferralCodeStatusAction (
  formData: FormData
): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const codeId = String(formData.get("codeId") ?? "").trim();
  const nextStatus = String(formData.get("nextStatus") ?? "active");
  if (!codeId) {
    throw new Error("Missing referral code id.");
  }

  await updateReferralCodeStatus(codeId, nextStatus === "active");
  revalidatePath("/admin");
}

export async function deleteReferralPartnerAction (formData: FormData): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const partnerId = String(formData.get("partnerId") ?? "").trim();
  if (!partnerId) {
    throw new Error("Missing partner id.");
  }

  await deleteReferralPartner(partnerId);
  revalidatePath("/admin");
}

export async function deleteReferralCodeAction (formData: FormData): Promise<void>
{
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const codeId = String(formData.get("codeId") ?? "").trim();
  if (!codeId) {
    throw new Error("Missing referral code id.");
  }

  await deleteReferralCode(codeId);
  revalidatePath("/admin");
}

