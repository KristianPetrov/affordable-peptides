import "server-only";

import { auth } from "@/lib/auth";
import { getOrderAccessRecord } from "@/lib/db";
import { isPayRamMainnetTestMode } from "./config";
import { verifyGuestAccessToken } from "./security";

export async function authorizePaymentOrderAccess(
  orderId: string,
  guestToken?: string | null
) {
  const access = await getOrderAccessRecord(orderId);
  if (!access) {
    return null;
  }

  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  const isOwner =
    Boolean(session?.user?.id) && session?.user?.id === access.order.userId;
  const isAdmin = session?.user?.role === "ADMIN";
  if (
    isPayRamMainnetTestMode() &&
    access.order.paymentMethod === "card_crypto" &&
    !isAdmin
  ) {
    return null;
  }
  const hasValidGuestToken = guestToken
    ? verifyGuestAccessToken(guestToken, access.guestAccessTokenHash)
    : false;

  return isOwner || isAdmin || hasValidGuestToken ? access.order : null;
}
