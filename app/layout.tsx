import { Geist, Geist_Mono } from "next/font/google";

import { AgeGateProvider } from "@/components/AgeGateProvider";
import { Providers } from "@/components/Providers";
import {
  organizationJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

import "./globals.css";
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AgeGateProvider>
          <Providers>
            <div className="flex min-h-screen flex-col bg-black text-zinc-100">
              <div className="flex-1">{children}</div>
              <footer className="border-t border-purple-900/40 bg-black/80 px-6 py-6 text-center text-xs text-zinc-400 sm:text-sm">
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
              </footer>
            </div>
            {globalJsonLd.map((schema) => (
              <script
                key={`global-jsonld-${String(schema["@type"])}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
              />
            ))}
          </Providers>
          <Analytics />
        </AgeGateProvider>
      </body>
    </html>
  );
}
