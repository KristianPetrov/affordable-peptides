"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";

import { StorefrontProvider } from "@/components/store/StorefrontContext";
import { TikTokPixel } from "@/components/analytics/TikTokPixel";
import {
  AnalyticsConsentBanner,
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from "@/components/analytics/AnalyticsConsent";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <AnalyticsConsentProvider>
        <Suspense fallback={null}>
          <ConditionalTikTokPixel />
        </Suspense>
        <AnalyticsConsentBanner />
        <StorefrontProvider>{children}</StorefrontProvider>
      </AnalyticsConsentProvider>
    </SessionProvider>
  );
}

function ConditionalTikTokPixel() {
  const { consent } = useAnalyticsConsent();
  if (consent !== "granted") {
    return null;
  }
  return <TikTokPixel />;
}







