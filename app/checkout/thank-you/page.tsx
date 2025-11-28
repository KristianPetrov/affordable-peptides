"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, Suspense } from "react";

import NavBar from "@/components/NavBar";
import {
  buildCashAppLink,
  buildVenmoLink,
  calculateCashAppTotal,
  calculateVenmoTotal,
  ZELLE_EMAIL,
  ZELLE_RECIPIENT_NAME,
} from "@/lib/payment-links";

const PHONE_NUMBER = "(951) 539-3821";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const orderId = searchParams.get("orderId");
  const orderAmountParam = searchParams.get("orderAmount");
  const orderAmount = useMemo(() => {
    if (!orderAmountParam) {
      return null;
    }
    const parsed = Number(orderAmountParam);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return null;
  }, [orderAmountParam]);
  const formattedOrderNumber = useMemo(() => {
    if (!orderNumber) {
      return "";
    }

    const parts = orderNumber.split("-");
    if (parts.length === 2 && parts[1].length === 11) {
      return `${parts[0]}-${parts[1].slice(0, 5)}-${parts[1].slice(5)}`;
    }

    return orderNumber;
  }, [orderNumber]);
  const orderReference = formattedOrderNumber || orderNumber;
  const venmoNote = `Order ${orderReference}`;
  const cashAppCharge = useMemo(
    () => (orderAmount ? calculateCashAppTotal(orderAmount) : null),
    [orderAmount]
  );
  const venmoCharge = useMemo(
    () => (orderAmount ? calculateVenmoTotal(orderAmount) : null),
    [orderAmount]
  );
  const cashAppLink = useMemo(
    () => buildCashAppLink(cashAppCharge ?? orderAmount ?? undefined),
    [cashAppCharge, orderAmount]
  );
  const venmoLink = useMemo(
    () =>
      buildVenmoLink({
        amount: venmoCharge ?? orderAmount ?? undefined,
        note: venmoNote,
      }),
    [venmoCharge, orderAmount, venmoNote]
  );
  const paymentAmountDisplay = orderAmount
    ? `$${orderAmount.toFixed(2)}`
    : null;
  const cashAppLabel = cashAppCharge
    ? `Pay via Cash App ($${cashAppCharge.toFixed(2)})`
    : "Pay via Cash App";
  const venmoLabel = venmoCharge
    ? `Pay via Venmo ($${venmoCharge.toFixed(2)})`
    : "Pay via Venmo";

  if (!orderNumber || !orderId) {
    return (
      <div className="min-h-screen bg-black text-zinc-100">
        <NavBar />
        <main className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-4">
              Order not found
            </h1>
            <Link
              href="/store"
              className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-8 sm:p-12 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
            <div className="text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="mb-4 text-3xl font-semibold text-white sm:text-4xl">
                Order Received!
              </h1>
              <p className="mb-8 text-lg text-zinc-300">
                Your Order ID:{" "}
                <span className="font-mono font-semibold text-purple-200">
                  {formattedOrderNumber || orderNumber}
                </span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-purple-900/40 bg-black/60 p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  Next Steps
                </h2>
                <ol className="space-y-4 text-zinc-300">
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-semibold text-purple-200">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        Send your payment via Cash App, Venmo, or Zelle using
                        the quick links below.
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Include your order number in the payment note so we can
                        match it instantly.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-semibold text-purple-200">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        Text{" "}
                        <Link
                          href={`tel:${PHONE_NUMBER.replace(/\D/g, "")}`}
                          className="text-purple-200 underline hover:text-purple-100"
                        >
                          {PHONE_NUMBER}
                        </Link>{" "}
                        with:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                        <li>• Your full name</li>
                        <li>• Your Order ID: {formattedOrderNumber || orderNumber}</li>
                        <li>• A screenshot of payment</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-semibold text-purple-200">
                      3
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        Your order ships after manual confirmation.
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        We&apos;ll notify you once your payment is confirmed and
                        your order is shipped.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-purple-900/40 bg-purple-500/10 p-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">
                  Instant Payment Links
                </h3>
                <div className="rounded-2xl border border-green-500/60 bg-green-500/10 p-4 shadow-[0_10px_35px_rgba(16,185,129,0.25)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-green-200">
                    Preferred • No Fees
                  </p>
                  <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-2xl font-semibold text-green-100">
                        Pay with Zelle
                      </p>
                      <p className="mt-1 text-sm text-green-50/80">
                        Send{" "}
                        <span className="font-semibold text-green-50">
                          {paymentAmountDisplay ?? "your order total"}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-green-50">
                          {ZELLE_EMAIL}
                        </span>{" "}
                        (recipient:{" "}
                        <span className="font-semibold text-green-50">
                          {ZELLE_RECIPIENT_NAME}
                        </span>
                        ) via the Zelle app or your bank. This is the fastest way to
                        get your order moving.
                      </p>
                      <p className="mt-2 text-xs text-green-100/70">
                        Include Order {orderReference} in the memo so we can match it immediately.
                      </p>
                    </div>
                    <div className="flex flex-col items-stretch gap-2 md:items-end">
                      <span className="rounded-lg border border-green-400/50 bg-green-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-green-100">
                        Zelle Details
                      </span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(ZELLE_EMAIL)}
                        className="rounded-full bg-green-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-green-400"
                      >
                        Copy Email
                      </button>
                    </div>
                  </div>
                </div>
                <p className="mt-6 text-sm text-zinc-300">
                  Amount due for app payments:{" "}
                  <span className="font-semibold text-white">
                    {paymentAmountDisplay ?? "use the total shown above"}
                  </span>
                </p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <Link
                    href={cashAppLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-full bg-emerald-500 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-400"
                  >
                    {cashAppLabel}
                  </Link>
                  <Link
                    href={venmoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-full bg-blue-600 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-blue-500"
                  >
                    {venmoLabel}
                  </Link>
                </div>
                <div className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
                  <p className="text-sm font-semibold text-yellow-200 mb-2">
                    ⚠️ Important: Include Order Number in Payment Memo
                  </p>
                  <p className="text-xs text-yellow-100/90">
                    When sending payment via Cash App, Venmo, or Zelle, please include your order number{" "}
                    <span className="font-semibold">({orderReference})</span> in the payment memo/note. This helps us quickly match your payment to your order.
                  </p>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                  <li className="rounded-xl border border-green-500/40 bg-green-500/5 p-3">
                    <span className="font-semibold text-green-200">Zelle (Preferred):</span> Free, instant, and no limits from us. Send{" "}
                    {paymentAmountDisplay ?? "your total"} to{" "}
                    <span className="font-semibold text-white">{ZELLE_EMAIL}</span> (recipient:{" "}
                    <span className="font-semibold text-white">{ZELLE_RECIPIENT_NAME}</span>) and place Order {orderReference} in the memo.
                  </li>
                  <li>
                    <span className="font-semibold text-white">Cash App:</span> Includes a 2.6% + $0.15 processing fee.{" "}
                    <span className="text-yellow-200">Add order number {orderReference} in the memo.</span>
                  </li>
                  <li>
                    <span className="font-semibold text-white">Venmo:</span> Includes a 1.9% + $0.10 fee.{" "}
                    <span className="text-yellow-200">Order number is pre-filled in the note.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-purple-900/40 bg-purple-500/10 p-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">
                  Need Help?
                </h3>
                <p className="text-sm text-zinc-300">
                  If you have any questions about your order, please contact us
                  at{" "}
                  <Link
                    href={`tel:${PHONE_NUMBER.replace(/\D/g, "")}`}
                    className="text-purple-200 underline hover:text-purple-100"
                  >
                    {PHONE_NUMBER}
                  </Link>{" "}
                  or reference your Order ID when reaching out.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-900/40 bg-black/40 p-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">
                  Track Your Orders
                </h3>
                <p className="text-sm text-zinc-300">
                  Sign in to your account to review this order anytime or create
                  an account to save your details for faster checkout.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/account"
                    className="rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
                  >
                    Go to Account
                  </Link>
                  <Link
                    href="/account/register"
                    className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500"
                  >
                    Create Account
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  href="/store"
                  className="rounded-full border border-purple-500/60 bg-purple-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
                >
                  Continue Shopping
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-zinc-100">
          <NavBar />
          <main className="flex min-h-[60vh] items-center justify-center px-6">
            <div className="text-center">
              <p className="text-zinc-400">Loading...</p>
            </div>
          </main>
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}

