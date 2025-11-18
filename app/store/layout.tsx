import type { ReactNode } from "react";

type StoreLayoutProps = {
  children: ReactNode;
  modal?: ReactNode;
};

export default function StoreLayout({ children, modal }: StoreLayoutProps) {
  return (
    <>
      {children}
      {modal ?? null}
    </>
  );
}

