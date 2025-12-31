"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ConsentState = "unknown" | "granted" | "denied";

type AnalyticsConsentContextValue = {
    consent: ConsentState;
    setGranted: () => void;
    setDenied: () => void;
};

const STORAGE_KEY = "ap_analytics_consent";

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(
    null
);

function readStoredConsent (): ConsentState
{
    if (typeof window === "undefined") {
        return "unknown";
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "granted" || raw === "denied") {
        return raw;
    }
    return "unknown";
}

function writeStoredConsent (consent: Exclude<ConsentState, "unknown">)
{
    try {
        window.localStorage.setItem(STORAGE_KEY, consent);
    } catch {
        // ignore
    }
}

export function AnalyticsConsentProvider ({ children }: { children: ReactNode })
{
    const pathname = usePathname();
    const shouldDisable = pathname.startsWith("/admin");

    const [consent, setConsent] = useState<ConsentState>("unknown");

    useEffect(() =>
    {
        if (shouldDisable) {
            setConsent("denied");
            return;
        }
        setConsent(readStoredConsent());
    }, [shouldDisable]);

    const setGranted = useCallback(() =>
    {
        setConsent("granted");
        if (typeof window !== "undefined") {
            writeStoredConsent("granted");
        }
    }, []);

    const setDenied = useCallback(() =>
    {
        setConsent("denied");
        if (typeof window !== "undefined") {
            writeStoredConsent("denied");
        }
    }, []);

    const value = useMemo(
        () => ({ consent, setGranted, setDenied }),
        [consent, setGranted, setDenied]
    );

    return (
        <AnalyticsConsentContext.Provider value={value}>
            {children}
        </AnalyticsConsentContext.Provider>
    );
}

export function useAnalyticsConsent (): AnalyticsConsentContextValue
{
    const ctx = useContext(AnalyticsConsentContext);
    if (!ctx) {
        throw new Error(
            "useAnalyticsConsent must be used within <AnalyticsConsentProvider />"
        );
    }
    return ctx;
}

export function AnalyticsConsentBanner ()
{
    const pathname = usePathname();
    const shouldDisable = pathname.startsWith("/admin");
    const { consent, setGranted, setDenied } = useAnalyticsConsent();

    if (shouldDisable || consent !== "unknown") {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie consent"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-purple-900/60 bg-black/90 px-4 py-4 backdrop-blur sm:px-6"
        >
            <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                        Cookies & tracking technologies
                    </p>
                    <p className="text-xs text-zinc-300">
                        With your consent, we use cookies and similar technologies (including the TikTok Pixel) to measure site usage and improve our store.
                        By selecting “Accept”, you consent to these analytics technologies. You can refuse or withdraw consent at any time by clearing this site’s stored data in your browser.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={setDenied}
                        className="rounded-full border border-purple-500/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-200 transition hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        Reject
                    </button>
                    <button
                        type="button"
                        onClick={setGranted}
                        className="rounded-full bg-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_14px_30px_rgba(120,48,255,0.35)] transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}



