import { NextRequest, NextResponse } from "next/server";

import { authorizePaymentOrderAccess } from "@/lib/payram/access";
import { resumePayRamAttempt } from "@/lib/payram/service";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  let body: { orderId?: unknown };
  try {
    body = (await request.json()) as { orderId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderId =
    typeof body.orderId === "string" ? body.orderId.trim() : "";
  const authorization = request.headers.get("authorization");
  const guestToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  let order: Awaited<ReturnType<typeof authorizePaymentOrderAccess>>;
  try {
    order = await authorizePaymentOrderAccess(orderId, guestToken);
  } catch (error) {
    console.error("Payment resume storage is unavailable:", error);
    return NextResponse.json(
      { error: "Payment status is temporarily unavailable." },
      { status: 503 }
    );
  }
  if (!order || order.paymentMethod !== "card_crypto") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const result = await resumePayRamAttempt({ order });
    return NextResponse.json(
      {
        paymentUrl: result.paymentUrl,
        status: result.attempt.status,
        requiresReconciliation: result.requiresReconciliation,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to resume payment.",
      },
      { status: 409 }
    );
  }
}
