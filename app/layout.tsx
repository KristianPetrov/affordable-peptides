import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Providers } from "@ap/shared-ui";
import { AgeGateProvider } from "@ap/shared-ui/age-gate-provider";
import { AGE_VERIFICATION_COOKIE, submitAgeVerification } from "@/app/actions/age";
import { AppSharedUiAdapterProvider } from "@/components/AppSharedUiAdapterProvider";

import {
  organizationJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

import "@ap/shared-ui/styles.css";
import { Analytics } from "@vercel/analytics/next"
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://www.setfreedigitaldisciples.com"
          crossOrigin=""
        />
        <link
          rel="preconnect"
          href="https://images-static.trustpilot.com"
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
              <div className="theme-page flex min-h-screen flex-col">
                <div className="flex-1">{children}</div>
                <footer className="theme-footer px-6 py-8 text-center text-xs sm:text-sm">
                  <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-3">
                    <Link
                      href="/legal/terms-of-use"
                      className="text-zinc-300 transition hover:text-white"
                    >
                      Terms
                    </Link>
                    <Link
                      href="/legal/privacy-policy"
                      className="text-zinc-300 transition hover:text-white"
                    >
                      Privacy
                    </Link>
                    <Link
                      href="/legal/shipping-policy"
                      className="text-zinc-300 transition hover:text-white"
                    >
                      Shipping
                    </Link>
                    <Link
                      href="/legal/refund-policy"
                      className="text-zinc-300 transition hover:text-white"
                    >
                      Refunds
                    </Link>
                    <Link
                      href="/legal/research-use-only"
                      className="text-zinc-300 transition hover:text-white"
                    >
                      Research Use Only
                    </Link>
                  </div>
                  <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
                    Products listed on this website are for laboratory research use only and are not intended for human or animal consumption.
                  </p>
                  <p className="mt-4 text-zinc-400">
                    Website designed by{" "}
                    <a
                      href="https://www.setfreedigitaldisciples.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-(--accent) underline decoration-dotted underline-offset-4 transition hover:text-(--foreground-strong)"
                    >
                      Set Free Digital Disciples
                    </a>
                  </p>
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
