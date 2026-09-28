"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { NavBar } from "@/components";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_SMS_LINK } from "@/lib/support";

type StatusResponse = {
  order: {
    orderNumber: string;
    status: string;
    amount: string;
  };
  payment: {
    status:
      | "AWAITING_PAYMENT"
      | "CONFIRMING"
      | "PAID"
      | "RECONCILING"
      | "ACTION_REQUIRED"
      | "REVIEW_REQUIRED";
    providerStatus: string | null;
    amount: string;
    asset: string;
    network: string;
    paymentUrl: string | null;
    canResume: boolean;
    filledAmount: string | null;
    confirmations: {
      current: number;
      required: number;
    };
    depositTransactionHashes: string[];
    updatedAt: string;
  };
};

const STATUS_CONTENT: Record<
  StatusResponse["payment"]["status"],
  { title: string; description: string; tone: string }
> = {
  AWAITING_PAYMENT: {
    title: "Awaiting payment",
    description:
      "Funding your PayRam wallet alone does not pay this order. Return to PayRam and complete the final merchant-payment confirmation.",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  },
  CONFIRMING: {
    title: "Confirming your Base deposit",
    description:
      "We detected the payment and are waiting for the required on-chain confirmation. Keep this page open; no second payment is needed.",
    tone: "border-blue-500/40 bg-blue-500/10 text-blue-100",
  },
  PAID: {
    title: "Payment confirmed",
    description:
      "The full USDC payment on Base is confirmed. Your order is released for fulfillment.",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  },
  RECONCILING: {
    title: "Reconciling payment",
    description:
      "The provider response was interrupted or is still being checked. Do not start another payment; we are reconciling this attempt.",
    tone: "border-violet-500/40 bg-violet-500/10 text-violet-100",
  },
  ACTION_REQUIRED: {
    title: "Payment link needs to be resumed",
    description:
      "This attempt expired or failed before settlement. Resume this same order to reuse an active link or create one safe replacement.",
    tone: "border-orange-500/40 bg-orange-500/10 text-orange-100",
  },
  REVIEW_REQUIRED: {
    title: "Payment needs review",
    description:
      "The payment arrived late, overpaid, or did not match the order's expected Base USDC settlement. We will review it manually.",
    tone: "border-red-500/40 bg-red-500/10 text-red-100",
  },
};

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resuming, setResuming] = useState(false);
  const [terminalError, setTerminalError] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!orderId) {
      setError("This payment-status link is incomplete.");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ orderId });
      const response = await fetch(`/api/payments/payram/status?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!response.ok) {
        setTerminalError(response.status === 404);
        throw new Error(
          response.status === 404
            ? "This payment-status link is invalid or expired."
            : "Payment status is temporarily unavailable."
        );
      }
      const next = (await response.json()) as StatusResponse;
      setData(next);
      setError(null);
      setTerminalError(false);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Payment status is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const shouldPoll =
    !terminalError && (!data ||
    data.payment.status === "AWAITING_PAYMENT" ||
    data.payment.status === "CONFIRMING" ||
    data.payment.status === "RECONCILING");

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [loadStatus, shouldPoll]);

  const statusContent = useMemo(
    () => (data ? STATUS_CONTENT[data.payment.status] : null),
    [data]
  );

  const resume = async () => {
    setResuming(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/payram/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId }),
      });
      const result = (await response.json()) as {
        paymentUrl?: string | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Payment could not be resumed.");
      }
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      await loadStatus();
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Payment could not be resumed."
      );
    } finally {
      setResuming(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)] sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-300">
              Card via crypto checkout
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Payment status
            </h1>

            {loading ? (
              <p className="mt-6 text-zinc-400">Loading stored payment status…</p>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {data && statusContent ? (
              <div className="mt-6 space-y-5" aria-live="polite">
                <div className={`rounded-2xl border p-5 ${statusContent.tone}`}>
                  <h2 className="text-xl font-semibold">
                    {statusContent.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6">
                    {statusContent.description}
                  </p>
                </div>

                <dl className="grid gap-3 rounded-2xl border border-purple-900/40 bg-black/50 p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">Order</dt>
                    <dd className="mt-1 font-mono text-white">
                      {data.order.orderNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Invoice amount</dt>
                    <dd className="mt-1 font-semibold text-white">
                      ${data.payment.amount} {data.payment.asset} on{" "}
                      {data.payment.network}
                    </dd>
                  </div>
                  {data.payment.filledAmount ? (
                    <div>
                      <dt className="text-zinc-500">Detected amount</dt>
                      <dd className="mt-1 text-white">
                        {data.payment.filledAmount} {data.payment.asset}
                      </dd>
                    </div>
                  ) : null}
                  {data.payment.confirmations.required > 0 ? (
                    <div>
                      <dt className="text-zinc-500">Confirmations</dt>
                      <dd className="mt-1 text-white">
                        {data.payment.confirmations.current} /{" "}
                        {data.payment.confirmations.required}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {data.payment.depositTransactionHashes.length > 0 ? (
                  <div className="rounded-2xl border border-purple-900/40 bg-black/50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                      Deposit transaction
                    </p>
                    {data.payment.depositTransactionHashes.map((hash) => (
                      <Link
                        key={hash}
                        href={`https://basescan.org/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block break-all font-mono text-xs text-cyan-300 underline"
                      >
                        {hash}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {data.payment.status !== "PAID" &&
                data.payment.status !== "RECONCILING" &&
                data.payment.status !== "REVIEW_REQUIRED" ? (
                  <button
                    type="button"
                    onClick={() => void resume()}
                    disabled={resuming}
                    className="w-full rounded-full bg-cyan-600 px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-950"
                  >
                    {resuming
                      ? "Resuming…"
                      : data.payment.paymentUrl
                        ? "Continue to PayRam"
                        : "Resume this order"}
                  </button>
                ) : null}

                <p className="text-center text-sm text-zinc-400">
                  Need help?{" "}
                  <Link
                    href={SUPPORT_SMS_LINK}
                    className="text-purple-200 underline"
                  >
                    Text {SUPPORT_PHONE_DISPLAY}
                  </Link>{" "}
                  with your order number.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black p-10 text-center text-zinc-400">
          Loading payment status…
        </div>
      }
    >
      <PaymentStatusContent />
    </Suspense>
  );
}
