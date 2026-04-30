import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getOrderById, updateOrderStatus } from "@/lib/db";
import { sendAdminPaymentReceivedEmail, sendOrderPaidEmail } from "@/lib/email";
import { calculateOrderTotals } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

function asUpperCurrency (input: unknown): string
{
  return typeof input === "string" && input.trim()
    ? input.trim().toUpperCase()
    : "USD";
}

async function handleCheckoutSessionCompleted (session: Stripe.Checkout.Session)
{
  const metadata = session.metadata ?? {};
  const orderId = metadata.orderId?.trim();
  if (!orderId) {
    return { ok: false as const, error: "Missing metadata.orderId" };
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return { ok: false as const, error: "Order not found" };
  }

  if (order.status === "PAID") {
    return { ok: true as const, status: "already_paid" as const, orderId };
  }

  const totals = calculateOrderTotals(order);
  const amountPaid =
    typeof session.amount_total === "number"
      ? session.amount_total / 100
      : totals.total;
  const currency = asUpperCurrency(session.currency);

  const notesLine = [
    `Card payment confirmed (Stripe).`,
    `Session: ${session.id}`,
    session.payment_intent ? `PaymentIntent: ${String(session.payment_intent)}` : null,
    `Amount: $${amountPaid.toFixed(2)} ${currency}`,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedNotes = [order.notes?.trim(), notesLine].filter(Boolean).join("\n");

  const updated = await updateOrderStatus(
    order.id,
    "PAID",
    mergedNotes,
    order.trackingNumber,
    order.trackingCarrier
  );

  if (!updated) {
    return { ok: false as const, error: "Failed to update order" };
  }

  await Promise.all([
    sendAdminPaymentReceivedEmail(updated, {
      provider: "Debit/credit card",
      paymentId: session.payment_intent ? String(session.payment_intent) : session.id,
      amountPaid,
      currency,
    }),
    sendOrderPaidEmail(updated),
  ]);

  return { ok: true as const, status: "paid" as const, orderId };
}

async function handlePaymentIntentSucceeded (intent: Stripe.PaymentIntent)
{
  const metadata = intent.metadata ?? {};
  const orderId = metadata.orderId?.trim();
  if (!orderId) {
    return { ok: false as const, error: "Missing metadata.orderId" };
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return { ok: false as const, error: "Order not found" };
  }

  if (order.status === "PAID") {
    return { ok: true as const, status: "already_paid" as const, orderId };
  }

  const totals = calculateOrderTotals(order);
  const amountPaid =
    typeof intent.amount_received === "number"
      ? intent.amount_received / 100
      : typeof intent.amount === "number"
        ? intent.amount / 100
        : totals.total;
  const currency = asUpperCurrency(intent.currency);

  const notesLine = [
    `Card payment confirmed (Stripe).`,
    `PaymentIntent: ${intent.id}`,
    `Amount: $${amountPaid.toFixed(2)} ${currency}`,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedNotes = [order.notes?.trim(), notesLine].filter(Boolean).join("\n");

  const updated = await updateOrderStatus(
    order.id,
    "PAID",
    mergedNotes,
    order.trackingNumber,
    order.trackingCarrier
  );

  if (!updated) {
    return { ok: false as const, error: "Failed to update order" };
  }

  await Promise.all([
    sendAdminPaymentReceivedEmail(updated, {
      provider: "Debit/credit card",
      paymentId: intent.id,
      amountPaid,
      currency,
    }),
    sendOrderPaidEmail(updated),
  ]);

  return { ok: true as const, status: "paid" as const, orderId };
}

export async function POST (request: NextRequest)
{
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Only treat successful paid sessions as a completed payment.
        if (session.payment_status === "paid") {
          const result = await handleCheckoutSessionCompleted(session);
          return NextResponse.json(result);
        }
        return NextResponse.json({ ok: true, status: "ignored" });
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const result = await handlePaymentIntentSucceeded(intent);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ ok: true, status: "unhandled" });
    }
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}

