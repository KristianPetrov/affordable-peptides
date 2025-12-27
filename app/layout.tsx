import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { AgeGateProvider } from "@/components/AgeGateProvider";
import { Providers } from "@/components/Providers";
import { organizationJsonLd, serializeJsonLd, websiteJsonLd } from "@/lib/seo";

import "./globals.css";

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

export default function RootLayout ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>)
{
  const globalJsonLd = [organizationJsonLd, websiteJsonLd];
  const tiktokPixelId =
    process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {tiktokPixelId ? (
          <>
            <Script id="tiktok-pixel" strategy="afterInteractive">
              {`
!function (w, d, t) {
  w.TiktokAnalyticsObject = t;
  var ttq = w[t] = w[t] || [];
  ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
  ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
  for (var i = 0; i < ttq.methods.length; i++) { ttq.setAndDefer(ttq, ttq.methods[i]); }
  ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) { ttq.setAndDefer(e, ttq.methods[n]); } return e; };
  ttq.load = function (e, n) {
    ttq._i = ttq._i || {};
    ttq._i[e] = [];
    ttq._i[e]._u = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._t = ttq._t || {};
    ttq._t[e] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[e] = n || {};
    var i = d.createElement("script");
    i.type = "text/javascript";
    i.async = !0;
    i.src = ttq._i[e]._u + "?sdkid=" + e + "&lib=" + t;
    var s = d.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(i, s);
  };
  ttq.load("${tiktokPixelId}");
  ttq.page();
}(window, document, "ttq");
              `}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${tiktokPixelId}&noscript=1`}
              />
            </noscript>
          </>
        ) : null}
        <AgeGateProvider>
          <Providers>
            <div className="flex min-h-screen flex-col bg-black text-zinc-100">
              <div className="flex-1">{children}</div>
              <footer className="border-t border-purple-900/40 bg-black/80 px-6 py-6 text-center text-xs text-zinc-500 sm:text-sm">
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
        </AgeGateProvider>
      </body>
    </html>
  );
}
