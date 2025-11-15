import type { ReactNode } from "react";

import { StorefrontProvider } from "@/components/store/StorefrontContext";

type StoreLayoutProps = {
  children: ReactNode;
  modal?: ReactNode;
};

export default function StoreLayout({ children, modal }: StoreLayoutProps) {
  return (
    <StorefrontProvider>
      {children}
      {modal ?? null}
    </StorefrontProvider>
  );
}

