import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { processEmailOutbox } from "@/lib/email-outbox";
import { confirmLegacyOrderPayment } from "@/lib/payram/repository";
import { getStripe } from "@/lib/stripe";

function asUpperCurrency (input: unknown): string
{
  return typeof input === "string" && input.trim()
    ? input.trim().toUpperCase()
    : "";
}

async function handleCheckoutSessionCompleted (session: Stripe.Checkout.Session)
{
  const metadata = session.metadata ?? {};
  const orderId = metadata.orderId?.trim();
  if (!orderId) {
    return { ok: false as const, error: "Missing metadata.orderId" };
  }
  if (typeof session.amount_total !== "number") {
    return { ok: false as const, error: "Missing authoritative amount_total" };
  }
  const amountPaid = session.amount_total / 100;
  const currency = asUpperCurrency(session.currency);
  const paymentId = session.payment_intent
    ? String(session.payment_intent)
    : session.id;
  const transition = await confirmLegacyOrderPayment({
    orderId,
    amount: amountPaid,
    currency,
    payload: {
      provider: "Debit/credit card",
      paymentId,
      amountPaid,
      currency,
    },
  });

  if (transition === "PAID") {
    processEmailOutbox(5).catch((error) => {
      console.error("Stripe payment email outbox failed:", error);
    });
  }
  return {
    ok: transition === "PAID" || transition.startsWith("ALREADY_"),
    status: transition.toLowerCase(),
    orderId,
  };
}

async function handlePaymentIntentSucceeded (intent: Stripe.PaymentIntent)
{
  const metadata = intent.metadata ?? {};
  const orderId = metadata.orderId?.trim();
  if (!orderId) {
    return { ok: false as const, error: "Missing metadata.orderId" };
  }
  if (typeof intent.amount_received !== "number" || intent.amount_received <= 0) {
    return {
      ok: false as const,
      error: "Missing authoritative amount_received",
    };
  }
  const amountPaid = intent.amount_received / 100;
  const currency = asUpperCurrency(intent.currency);
  const transition = await confirmLegacyOrderPayment({
    orderId,
    amount: amountPaid,
    currency,
    payload: {
      provider: "Debit/credit card",
      paymentId: intent.id,
      amountPaid,
      currency,
    },
  });

  if (transition === "PAID") {
    processEmailOutbox(5).catch((error) => {
      console.error("Stripe payment email outbox failed:", error);
    });
  }
  return {
    ok: transition === "PAID" || transition.startsWith("ALREADY_"),
    status: transition.toLowerCase(),
    orderId,
  };
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

