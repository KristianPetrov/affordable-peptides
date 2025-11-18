"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";

import NavBar from "@/components/NavBar";

const PHONE_NUMBER = "(951) 539-3821";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const orderId = searchParams.get("orderId");
  const [formattedOrderNumber, setFormattedOrderNumber] = useState<string>("");

  useEffect(() => {
    if (orderNumber) {
      // Format AP-12345678 to AP-12345-678
      const parts = orderNumber.split("-");
      if (parts.length === 2 && parts[1].length === 11) {
        setFormattedOrderNumber(
          `${parts[0]}-${parts[1].slice(0, 5)}-${parts[1].slice(5)}`
        );
      } else {
        setFormattedOrderNumber(orderNumber);
      }
    }
  }, [orderNumber]);

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
                        Send your payment via CashApp, Zelle, or your preferred
                        method.
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Payment details will be provided separately or contact us
                        for payment instructions.
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
                        <a
                          href={`tel:${PHONE_NUMBER.replace(/\D/g, "")}`}
                          className="text-purple-200 underline hover:text-purple-100"
                        >
                          {PHONE_NUMBER}
                        </a>{" "}
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
                  Need Help?
                </h3>
                <p className="text-sm text-zinc-300">
                  If you have any questions about your order, please contact us
                  at{" "}
                  <a
                    href={`tel:${PHONE_NUMBER.replace(/\D/g, "")}`}
                    className="text-purple-200 underline hover:text-purple-100"
                  >
                    {PHONE_NUMBER}
                  </a>{" "}
                  or reference your Order ID when reaching out.
                </p>
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

