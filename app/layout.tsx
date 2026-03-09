import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@ap/shared-ui";
import { AgeGateProvider } from "@ap/shared-ui/age-gate-provider";
import { LABORATORY_USE_ONLY_NOTICE, WEBSITE_RESEARCH_DISCLAIMER } from "@ap/shared-core";
import { AGE_VERIFICATION_COOKIE, submitAgeVerification } from "@/app/actions/age";
import { AppSharedUiAdapterProvider } from "@/components/AppSharedUiAdapterProvider";

import {
  organizationJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

import "@ap/shared-ui/styles.css";
import { Analytics } from "@vercel/analytics/next";
export { metadata } from "./metadata";
export { viewport } from "./viewport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalJsonLd = [organizationJsonLd, websiteJsonLd];

  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://www.setfreedigitaldisciples.com"
          crossOrigin=""
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AgeGateProvider
          cookieName={AGE_VERIFICATION_COOKIE}
          submitAgeVerification={submitAgeVerification}
        >
          <AppSharedUiAdapterProvider>
            <Providers>
              <div className="flex min-h-screen flex-col bg-black text-zinc-100">
                <div className="flex-1">{children}</div>
                <footer className="border-t border-purple-900/40 bg-black/80 px-6 py-6 text-center text-xs text-zinc-400 sm:text-sm">
                  <div className="mx-auto max-w-4xl space-y-3">
                    <p className="font-medium text-zinc-300">
                      {WEBSITE_RESEARCH_DISCLAIMER}
                    </p>
                    <p>{LABORATORY_USE_ONLY_NOTICE}</p>
                    <p>
                      Website designed by{" "}
                      <a
                        href="https://www.setfreedigitaldisciples.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-200 underline decoration-dotted underline-offset-4 transition hover:text-white"
                      >
                        Set Free Digital Disciples
                      </a>{" "}
                    </p>
                  </div>
                </footer>
              </div>
              {globalJsonLd.map((schema) => (
                <script
                  key={`global-jsonld-${String(schema["@type"])}`}
                  type="application/ld+json"
                  defer
                  dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
                />
              ))}
            </Providers>
          </AppSharedUiAdapterProvider>
          <Analytics />
        </AgeGateProvider>
      </body>
    </html>
  );
}
