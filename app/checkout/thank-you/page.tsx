"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, Suspense } from "react";

import { NavBar } from "@ap/shared-ui";
import
  {
    SUPPORT_PHONE_DISPLAY,
    SUPPORT_SMS_LINK,
  } from "@/lib/support";
import { BUSINESS_REVIEW_URL } from "@/lib/reviews";

function ThankYouContent ()
{
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const orderStatus = searchParams.get("orderStatus");
  const formattedOrderNumber = useMemo(() =>
  {
    if (!orderNumber) {
      return "";
    }

    const parts = orderNumber.split("-");
    if (parts.length === 2 && parts[1].length === 11) {
      return `${parts[0]}-${parts[1].slice(0, 5)}-${parts[1].slice(5)}`;
    }

    return orderNumber;
  }, [orderNumber]);
  const isPaidOrder = orderStatus === "PAID";

  if (!orderNumber) {
    return (
      <div className="theme-page min-h-screen">
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
    <div className="theme-page min-h-screen">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <div className="theme-card-gradient rounded-3xl p-8 sm:p-12">
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
                {isPaidOrder ? "Payment Confirmed!" : "Order Received!"}
              </h1>
              <p className="mb-8 text-lg text-zinc-300">
                Your Order ID:{" "}
                <span className="font-mono font-semibold text-purple-200">
                  {formattedOrderNumber || orderNumber}
                </span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="theme-surface rounded-2xl p-6">
                <h2 className="mb-4 text-xl font-semibold text-white">
                  Next Steps
                </h2>
                <ol className="space-y-4 text-zinc-300">
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-semibold text-purple-200">
                      1
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        {isPaidOrder
                          ? "Your payment was processed successfully at checkout."
                          : "Your order is pending payment confirmation."}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {isPaidOrder
                          ? "No additional payment step is required before we begin processing your order."
                          : "Our team will review your order and follow up if any additional payment step is required."}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 font-semibold text-purple-200">
                      2
                    </span>
                    <div>
                      <p className="font-medium text-white">
                        {isPaidOrder
                          ? "We’ll email you again when your order ships."
                          : "Watch your inbox for order updates."}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {isPaidOrder
                          ? "Keep this order number handy if you need support."
                          : "If we need anything else to finalize payment, support will contact you directly."}
                      </p>
                    </div>
                  </li>
                </ol>
                <p className="mt-6 text-sm text-zinc-400">
                  If you do not receive an email confirmation, please check your spam
                  or junk folder before reaching out.
                </p>
              </div>

              {isPaidOrder ? (
                <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-6">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    Payment Details
                  </h3>
                  <p className="text-lg font-semibold text-cyan-50">
                    Charged securely at checkout
                  </p>
                  <p className="mt-2 text-sm text-cyan-100/80">
                    Payment method: Card or wallet via NMI
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-6">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-200">
                    Payment Pending Review
                  </h3>
                  <p className="text-sm text-yellow-100/90">
                    Your order is saved and awaiting payment confirmation. Our support
                    team will contact you if any additional information is needed.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-purple-900/40 bg-purple-500/10 p-6">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200">
                  Need Help?
                </h3>
                <p className="text-sm text-zinc-300">
                  If you have any questions about your order, please text us
                  at{" "}
                  <Link
                    href={SUPPORT_SMS_LINK}
                    className="text-purple-200 underline hover:text-purple-100"
                  >
                    {SUPPORT_PHONE_DISPLAY}
                  </Link>{" "}
                  or reference your Order ID when reaching out.
                </p>
              </div>

              <div className="theme-surface rounded-2xl p-6">
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

              {BUSINESS_REVIEW_URL && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Share Your Experience
                  </h3>
                  <p className="text-sm text-zinc-200">
                    After your order arrives, leave a quick review for Affordable
                    Peptides to help other researchers shop with confidence.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={BUSINESS_REVIEW_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-400"
                    >
                      Leave a Review
                    </Link>
                  </div>
                </div>
              )}

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

export default function ThankYouPage ()
{
  return (
    <Suspense
      fallback={
        <div className="theme-page min-h-screen">
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

