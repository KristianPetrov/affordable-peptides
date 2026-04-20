"use client";

import { useEffect, useMemo, useState } from "react";

const PLAID_ORIGIN_HOSTS = new Set([
  "greenbyphone.com",
  "www.greenbyphone.com",
]);

/**
 * Delegates browser features to Green's Plaid document. Without these, Plaid
 * Link and third-party scripts inside the frame log Permissions-Policy
 * violations (e.g. accelerometer, encrypted-media).
 */
const GREEN_PLAID_IFRAME_ALLOW = [
  "payment *",
  "fullscreen *",
  "accelerometer *",
  "gyroscope *",
  "magnetometer *",
  "encrypted-media *",
  "clipboard-write *",
  "publickey-credentials-get *",
  "camera *",
  "microphone *",
].join("; ");

function isTrustedGreenPlaidOrigin (origin: string): boolean
{
  try {
    const { hostname } = new URL(origin);
    if (PLAID_ORIGIN_HOSTS.has(hostname)) {
      return true;
    }
    return hostname.endsWith(".greenbyphone.com");
  } catch {
    return false;
  }
}

export type GreenPlaidIframeProps = {
  clientId: string;
  payorId: string;
  className?: string;
  title?: string;
  /** Default `modal`: large overlay so Plaid is not trapped in a short inline frame. */
  layout?: "modal" | "inline";
  onExit?: () => void;
  onSuccess?: (payload: unknown) => void;
  onError?: (payload: unknown) => void;
};

export function GreenPlaidIframe ({
  clientId,
  payorId,
  className,
  title = "Bank login",
  layout = "modal",
  onExit,
  onSuccess,
  onError,
}: GreenPlaidIframeProps)
{
  const src = useMemo(
    () =>
      `https://www.greenbyphone.com/Plaid?client_id=${encodeURIComponent(
        clientId
      )}&customer_id=${encodeURIComponent(payorId)}`,
    [clientId, payorId]
  );

  const [modalOpen, setModalOpen] = useState(layout === "modal");

  useEffect(() =>
  {
    if (layout === "modal") {
      setModalOpen(true);
    }
  }, [layout, src]);

  useEffect(() =>
  {
    const handler = (event: MessageEvent) =>
    {
      if (!isTrustedGreenPlaidOrigin(event.origin)) {
        return;
      }
      const data = event.data as { event?: string; data?: unknown } | null;
      if (!data || typeof data !== "object" || typeof data.event !== "string") {
        return;
      }
      switch (data.event) {
        case "GreenPlaidOnExit":
          onExit?.();
          if (layout === "modal") {
            setModalOpen(false);
          }
          break;
        case "GreenPlaidOnSuccess":
          onSuccess?.(data.data);
          if (layout === "modal") {
            setModalOpen(false);
          }
          break;
        case "GreenPlaidOnError":
          onError?.(data.data);
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [layout, onError, onExit, onSuccess]);

  useEffect(() =>
  {
    if (layout !== "modal" || !modalOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () =>
    {
      document.body.style.overflow = previous;
    };
  }, [layout, modalOpen]);

  useEffect(() =>
  {
    if (layout !== "modal" || !modalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) =>
    {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layout, modalOpen]);

  if (layout === "inline") {
    return (
      <iframe
        key={src}
        title={title}
        src={src}
        className={className}
        allow={GREEN_PLAID_IFRAME_ALLOW}
        referrerPolicy="strict-origin-when-cross-origin"
        style={{
          width: "100%",
          border: 0,
          borderRadius: 12,
          minHeight: 720,
          height: "min(85vh, 900px)",
        }}
      />
    );
  }

  return (
    <>
      {!modalOpen && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-full border border-emerald-500/50 bg-emerald-950/40 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-900/50 sm:w-auto"
        >
          Open Plaid Link
        </button>
      )}
      {modalOpen && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-emerald-800/70 bg-[#040807] shadow-[0_25px_80px_rgba(16,185,129,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-emerald-900/50 px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <p className="text-sm font-semibold text-white">Secure bank linking</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Complete Plaid in this window. You can close it anytime and reopen
                  from here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="shrink-0 rounded-full border border-emerald-700/60 bg-black/50 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-emerald-100/90 transition hover:border-emerald-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040807]"
                aria-label="Close bank linking window"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3 sm:p-4">
              <div className="relative h-[min(78vh,820px)] min-h-[480px] w-full sm:min-h-[560px]">
                <iframe
                  key={src}
                  title={title}
                  src={src}
                  className={`absolute inset-0 h-full w-full rounded-xl ${className ?? ""}`}
                  allow={GREEN_PLAID_IFRAME_ALLOW}
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
