"use client";

import { useActionState, useId } from "react";

import type {
  AgeGateAction,
  AgeGateFormState,
  AgeGateStatus,
} from "@/app/actions/age";

type AgeGateProps = {
  initialStatus: AgeGateStatus;
  action: AgeGateAction;
};

const buildInitialState = (status: AgeGateStatus): AgeGateFormState => ({
  status,
  message: null,
});

export function AgeGate({ initialStatus, action }: AgeGateProps) {
  const rememberId = useId();
  const [state, formAction, isPending] = useActionState(
    action,
    buildInitialState(initialStatus)
  );

  const isVerified = state.status === "approved";

  if (isVerified) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      aria-hidden={false}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-heading"
        aria-describedby="age-gate-description"
        className="mx-4 w-full max-w-lg rounded-3xl border border-purple-500/30 bg-gradient-to-b from-[#120421] via-[#0d0318] to-[#05000a] p-8 text-purple-50 shadow-[0_0_35px_rgba(168,85,247,0.45)]"
      >
        <form action={formAction} className="space-y-6">
          <div className="space-y-2 text-center">
            <p
              id="age-gate-heading"
              className="text-xl font-semibold uppercase tracking-[0.3em]"
            >
              Age Restricted Content
            </p>
            <p
              id="age-gate-description"
              className="text-sm text-purple-200/80 tracking-[0.2em]"
            >
              Are you at least 18 years old?
            </p>
          </div>

          <label
            htmlFor={rememberId}
            className="flex items-center gap-3 text-sm text-purple-100/90"
          >
            <input
              id={rememberId}
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-purple-500/60 bg-transparent text-purple-400 focus:ring-purple-300"
            />
            Remember me on this device
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              name="decision"
              value="approve"
              disabled={isPending}
              className="flex-1 rounded-full bg-purple-500/80 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-400/80 disabled:opacity-60"
            >
              Yes, I&apos;m 18+
            </button>
            <button
              type="submit"
              name="decision"
              value="deny"
              disabled={isPending}
              className="flex-1 rounded-full border border-purple-400/60 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-purple-100 transition hover:border-purple-200 hover:text-white disabled:opacity-60"
            >
              No
            </button>
          </div>

          {state.status === "denied" && (
            <div className="space-y-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-center text-xs uppercase tracking-[0.3em] text-red-200">
              <p>{state.message}</p>
              <a
                href="https://www.responsibility.org/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-200 underline decoration-dashed decoration-purple-300/80 underline-offset-4"
              >
                Learn more about responsible use
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}



