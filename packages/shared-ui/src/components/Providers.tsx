"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { StorefrontProvider } from "./store/StorefrontContext";
import { TikTokPixel } from "./analytics/TikTokPixel";
import {
  AnalyticsConsentBanner,
  AnalyticsConsentProvider,
  useAnalyticsConsent,
} from "./analytics/AnalyticsConsent";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <AnalyticsConsentProvider>
          <Suspense fallback={null}>
            <ConditionalTikTokPixel />
          </Suspense>
          <AnalyticsConsentBanner />
          <StorefrontProvider>{children}</StorefrontProvider>
        </AnalyticsConsentProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

function ConditionalTikTokPixel() {
  const { consent } = useAnalyticsConsent();
  if (consent !== "granted") {
    return null;
  }
  return <TikTokPixel />;
}







