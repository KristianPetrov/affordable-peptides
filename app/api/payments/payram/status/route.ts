import { NextRequest, NextResponse } from "next/server";

import { authorizePaymentOrderAccess } from "@/lib/payram/access";
import { getLatestPaymentAttemptForOrder } from "@/lib/payram/repository";

export const dynamic = "force-dynamic";

function getGuestToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }
  return request.nextUrl.searchParams.get("token");
}

function customerStatus(
  orderStatus: string,
  attemptStatus: string
):
  | "AWAITING_PAYMENT"
  | "CONFIRMING"
  | "PAID"
  | "RECONCILING"
  | "ACTION_REQUIRED"
  | "REVIEW_REQUIRED" {
  if (orderStatus === "PAID" || orderStatus === "SHIPPED") {
    return "PAID";
  }
  if (attemptStatus === "REVIEW_REQUIRED" || orderStatus === "CANCELLED") {
    return "REVIEW_REQUIRED";
  }
  if (attemptStatus === "CONFIRMING") {
    return "CONFIRMING";
  }
  if (
    attemptStatus === "CREATING" ||
    attemptStatus === "RECONCILIATION_REQUIRED"
  ) {
    return "RECONCILING";
  }
  if (attemptStatus === "FAILED" || attemptStatus === "CANCELLED") {
    return "ACTION_REQUIRED";
  }
  return "AWAITING_PAYMENT";
}

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  let order: Awaited<ReturnType<typeof authorizePaymentOrderAccess>>;
  try {
    order = await authorizePaymentOrderAccess(
      orderId,
      getGuestToken(request)
    );
  } catch (error) {
    console.error("Payment status storage is unavailable:", error);
    return NextResponse.json(
      { error: "Payment status is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (!order) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let attempt: Awaited<ReturnType<typeof getLatestPaymentAttemptForOrder>>;
  try {
    attempt = await getLatestPaymentAttemptForOrder(order.id);
  } catch (error) {
    console.error("Payment attempt storage is unavailable:", error);
    return NextResponse.json(
      { error: "Payment status is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (!attempt) {
    return NextResponse.json(
      { error: "No PayRam payment attempt exists for this order." },
      { status: 404 }
    );
  }

  const status = customerStatus(order.status, attempt.status);
  const canResume =
    order.status === "PENDING_PAYMENT" &&
    [
      "OPEN",
      "CONFIRMING",
      "PARTIALLY_FILLED",
      "CANCELLED",
      "FAILED",
    ].includes(attempt.status);

  return NextResponse.json(
    {
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        amount: (order.totalAmount ?? order.subtotal).toFixed(2),
      },
      payment: {
        status,
        providerStatus: attempt.providerStatus,
        amount: attempt.invoiceAmount,
        asset: attempt.settlementAsset,
        network: attempt.settlementNetwork,
        paymentUrl: attempt.paymentUrl,
        canResume,
        filledAmount: attempt.filledAmount,
        confirmations: {
          current: attempt.confirmationCurrent,
          required: attempt.confirmationRequired,
        },
        depositTransactionHashes: attempt.depositTransactionHashes,
        updatedAt: attempt.updatedAt.toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}
