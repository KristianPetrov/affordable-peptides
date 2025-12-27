"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { tiktokPageView } from "@/lib/analytics/tiktok";

export function TikTokPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  useEffect(() => {
    tiktokPageView();
  }, [pathname, search]);

  return null;
}




