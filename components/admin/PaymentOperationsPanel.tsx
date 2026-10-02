"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  recordManualRefundForm,
  recordTreasurySweepForm,
  resolvePayRamTimeoutForm,
  type PaymentRecordFormState,
} from "@/app/actions/admin";

type AttemptSummary = {
  id: string;
  status: string;
  providerStatus: string | null;
  providerReference: string | null;
  invoiceAmount: string;
  settlementAsset: string;
  settlementNetwork: string;
  filledAmount: string | null;
  receivingAddress: string | null;
  depositTransactionHashes: string[];
  reviewReason: string | null;
  reconciliationError: string | null;
  updatedAt: string;
};

type RefundSummary = {
  id: string;
  attemptId: string | null;
  recipientAddress: string;
  amount: string;
  status: string;
  transactionHash: string | null;
  createdAt: string;
};

type SweepSummary = {
  id: string;
  attemptId: string;
  depositTransactionHash: string;
  sweepTransactionHash: string;
  amount: string;
  status: string;
  createdAt: string;
};

export function PaymentOperationsPanel({
  orderId,
  attempts,
  refunds,
  sweeps,
}: {
  orderId: string;
  attempts: AttemptSummary[];
  refunds: RefundSummary[];
  sweeps: SweepSummary[];
}) {
  const router = useRouter();
  const settledAttempt = attempts.find(
    (attempt) =>
      attempt.status === "FILLED" ||
      attempt.providerStatus === "FILLED" ||
      attempt.providerStatus === "OVER_FILLED"
  );
  const unresolvedAttempt = attempts.find(
    (attempt) =>
      attempt.status === "RECONCILIATION_REQUIRED" &&
      !attempt.providerReference
  );
  const initialState: PaymentRecordFormState = { success: true };
  const [refundState, refundAction, refundPending] = useActionState(
    recordManualRefundForm,
    initialState
  );
  const [sweepState, sweepAction, sweepPending] = useActionState(
    recordTreasurySweepForm,
    initialState
  );
  const [timeoutState, timeoutAction, timeoutPending] = useActionState(
    resolvePayRamTimeoutForm,
    initialState
  );
  const lastRefreshRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const updatedAt = Math.max(
      refundState.updatedAt ?? 0,
      sweepState.updatedAt ?? 0,
      timeoutState.updatedAt ?? 0
    );
    if (updatedAt > 0 && updatedAt !== lastRefreshRef.current) {
      lastRefreshRef.current = updatedAt;
      router.refresh();
    }
  }, [
    refundState.updatedAt,
    router,
    sweepState.updatedAt,
    timeoutState.updatedAt,
  ]);

  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 border-t border-cyan-900/40 pt-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
          PayRam settlement
        </h4>
        <div className="mt-2 space-y-2">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3 text-xs text-zinc-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-cyan-100">
                  {attempt.id.slice(0, 8)}
                </span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-200">
                  {attempt.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2">
                Invoice: {attempt.invoiceAmount} {attempt.settlementAsset} on{" "}
                {attempt.settlementNetwork}
              </p>
              {attempt.filledAmount ? (
                <p>Filled: {attempt.filledAmount} USDC</p>
              ) : null}
              {attempt.receivingAddress ? (
                <p className="mt-1 break-all font-mono text-[11px] text-zinc-400">
                  Deposit: {attempt.receivingAddress}
                </p>
              ) : null}
              {attempt.reviewReason ? (
                <p className="mt-2 text-red-300">
                  Review: {attempt.reviewReason.replaceAll("_", " ")}
                </p>
              ) : null}
              {attempt.reconciliationError ? (
                <p className="mt-2 text-amber-300">
                  Reconciliation: {attempt.reconciliationError}
                </p>
              ) : null}
              {attempt.depositTransactionHashes.map((hash) => (
                <a
                  key={hash}
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block break-all font-mono text-[11px] text-cyan-300 underline"
                >
                  Deposit tx: {hash}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      {unresolvedAttempt ? (
        <form
          action={timeoutAction}
          className="space-y-2 rounded-xl border border-violet-900/50 bg-violet-950/20 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
            Resolve ambiguous provider timeout
          </p>
          <p className="text-xs text-zinc-400">
            Use this only after searching the PayRam dashboard for invoice{" "}
            <span className="font-mono text-violet-200">
              {unresolvedAttempt.id}
            </span>{" "}
            and confirming that no payment session exists.
          </p>
          <input type="hidden" name="attemptId" value={unresolvedAttempt.id} />
          <label className="flex items-start gap-2 text-xs text-violet-100">
            <input
              type="checkbox"
              name="providerChecked"
              required
              className="mt-0.5"
            />
            I checked this exact invoice in PayRam and confirmed no provider
            session or funds exist.
          </label>
          <button
            type="submit"
            disabled={timeoutPending}
            className="w-full rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-violet-950"
          >
            {timeoutPending ? "Resolving…" : "Allow a safe replacement attempt"}
          </button>
          {timeoutState.error || timeoutState.message ? (
            <p
              aria-live="polite"
              className={`text-xs ${
                timeoutState.error ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {timeoutState.error ?? timeoutState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {settledAttempt ? (
        <>
          <form action={refundAction} className="space-y-2 rounded-xl border border-orange-900/50 bg-orange-950/15 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              Record manual USDC refund
            </p>
            <p className="text-xs text-zinc-400">
              Enter the customer-verified recipient address manually. Never copy
              the original transaction sender automatically.
            </p>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="attemptId" value={settledAttempt.id} />
            <input
              name="recipientAddress"
              required
              aria-label="Verified Base refund recipient address"
              placeholder="Verified Base recipient address"
              className="w-full rounded-lg border border-orange-900/50 bg-black/60 px-3 py-2 text-xs text-white"
            />
            <input
              name="amount"
              required
              aria-label="USDC refund amount"
              inputMode="decimal"
              placeholder="USDC amount"
              className="w-full rounded-lg border border-orange-900/50 bg-black/60 px-3 py-2 text-xs text-white"
            />
            <input
              name="transactionHash"
              required
              aria-label="Manual refund transaction hash"
              placeholder="Manual refund transaction hash"
              className="w-full rounded-lg border border-orange-900/50 bg-black/60 px-3 py-2 text-xs text-white"
            />
            <textarea
              name="notes"
              aria-label="Refund approval and verification notes"
              placeholder="Approval / verification notes"
              rows={2}
              className="w-full rounded-lg border border-orange-900/50 bg-black/60 px-3 py-2 text-xs text-white"
            />
            <label className="flex items-start gap-2 text-xs text-orange-100">
              <input
                type="checkbox"
                name="recipientVerified"
                required
                className="mt-0.5"
              />
              I verified this recipient address with the customer through a
              trusted channel before sending.
            </label>
            <button
              type="submit"
              disabled={refundPending}
              className="w-full rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:bg-orange-950"
            >
              {refundPending ? "Recording…" : "Record sent refund"}
            </button>
            {refundState.error || refundState.message ? (
              <p
                aria-live="polite"
                className={`text-xs ${
                  refundState.error ? "text-red-300" : "text-emerald-300"
                }`}
              >
                {refundState.error ?? refundState.message}
              </p>
            ) : null}
          </form>

          {settledAttempt.depositTransactionHashes.length > 0 ? (
            <form action={sweepAction} className="space-y-2 rounded-xl border border-emerald-900/50 bg-emerald-950/15 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Record confirmed SmartSweep
              </p>
              <input type="hidden" name="attemptId" value={settledAttempt.id} />
              <select
                name="depositTransactionHash"
                required
                aria-label="Deposit transaction swept"
                className="w-full rounded-lg border border-emerald-900/50 bg-black/60 px-3 py-2 text-xs text-white"
              >
                {settledAttempt.depositTransactionHashes.map((hash) => (
                  <option key={hash} value={hash}>
                    Deposit {hash.slice(0, 12)}…
                  </option>
                ))}
              </select>
              <input
                name="sweepTransactionHash"
                required
                aria-label="SmartSweep transaction hash"
                placeholder="SmartSweep transaction hash"
                className="w-full rounded-lg border border-emerald-900/50 bg-black/60 px-3 py-2 text-xs text-white"
              />
              <input
                name="amount"
                required
                aria-label="USDC amount swept to treasury"
                inputMode="decimal"
                defaultValue={settledAttempt.filledAmount ?? ""}
                placeholder="USDC amount swept"
                className="w-full rounded-lg border border-emerald-900/50 bg-black/60 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                disabled={sweepPending}
                className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-emerald-950"
              >
                {sweepPending ? "Recording…" : "Record treasury transfer"}
              </button>
              {sweepState.error || sweepState.message ? (
                <p
                  aria-live="polite"
                  className={`text-xs ${
                    sweepState.error ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {sweepState.error ?? sweepState.message}
                </p>
              ) : null}
            </form>
          ) : null}
        </>
      ) : null}

      {refunds.length > 0 ? (
        <div className="rounded-xl border border-orange-900/40 bg-black/40 p-3 text-xs">
          <p className="font-semibold text-orange-200">Refund records</p>
          {refunds.map((refund) => (
            <div key={refund.id} className="mt-2 text-zinc-300">
              {refund.amount} USDC • {refund.status}
              {refund.transactionHash ? (
                <a
                  href={`https://basescan.org/tx/${refund.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-orange-300 underline"
                >
                  transaction
                </a>
              ) : null}
              <p className="break-all font-mono text-[10px] text-zinc-500">
                To: {refund.recipientAddress}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {sweeps.length > 0 ? (
        <div className="rounded-xl border border-emerald-900/40 bg-black/40 p-3 text-xs">
          <p className="font-semibold text-emerald-200">Treasury transfers</p>
          {sweeps.map((sweep) => (
            <div key={sweep.id} className="mt-2 text-zinc-300">
              {sweep.amount} USDC • {sweep.status} •{" "}
              <a
                href={`https://basescan.org/tx/${sweep.sweepTransactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 underline"
              >
                sweep transaction
              </a>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
