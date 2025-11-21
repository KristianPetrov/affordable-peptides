"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import { StorefrontProvider } from "@/components/store/StorefrontContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <StorefrontProvider>{children}</StorefrontProvider>
    </SessionProvider>
  );
}







