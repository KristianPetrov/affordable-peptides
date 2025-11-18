"use client";

import type { ReactNode } from "react";

import { StorefrontProvider } from "@/components/store/StorefrontContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <StorefrontProvider>{children}</StorefrontProvider>;
}



