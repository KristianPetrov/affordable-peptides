"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export function TikTokPixel ()
{
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMountedRef = useRef(false);

  const shouldDisable = !PIXEL_ID || pathname.startsWith("/admin");

  useEffect(() =>
  {
    if (shouldDisable) {
      return;
    }

    // Avoid double-firing on initial mount (the base snippet calls ttq.page()).
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    try {
      window.ttq?.page?.();
    } catch {
      // ignore
    }
  }, [pathname, searchParams, shouldDisable]);

  if (shouldDisable) {
    return null;
  }

  return (
    <Script id="tiktok-pixel" strategy="lazyOnload">
      {`
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.instance=function(t){var e=ttq._i[t]||[];for(var n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
  ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
  ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},
  ttq._o[e]=n||{};var o=document.createElement("script");
  o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;
  var a=document.getElementsByTagName("script")[0];
  a.parentNode.insertBefore(o,a)};
  ttq.load('${PIXEL_ID}');
  ttq.page();
}(window, document, 'ttq');
      `}
    </Script>
  );
}



