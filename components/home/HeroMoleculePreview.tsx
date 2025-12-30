"use client";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import type { MoleculeDefinition } from "@/lib/molecules";

const MoleculeViewer = dynamic(() => import("@/components/MoleculeViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-full bg-purple-500/10">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-purple-100">
        Loading
      </span>
    </div>
  ),
});

type HeroMoleculePreviewProps = {
  productName: string;
  molecules: MoleculeDefinition[];
  className?: string;
  active?: boolean;
};

export default function HeroMoleculePreview({
  productName,
  molecules,
  className = "",
  active = true,
}: HeroMoleculePreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldMountViewer, setShouldMountViewer] = useState(false);

  useEffect(() =>
  {
    if (!active || shouldMountViewer) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setShouldMountViewer(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) =>
      {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMountViewer(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }

    return () => observer.disconnect();
  }, [active, shouldMountViewer]);

  if (!active || !shouldMountViewer) {
    return (
      <div
        ref={rootRef}
        className={`grid h-full w-full place-items-center rounded-full bg-purple-500/10 ${className}`}
        aria-label={`${productName} molecular visualization`}
        role="img"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-purple-100">
          Preview
        </span>
      </div>
    );
  }

  const viewerProps: ComponentProps<typeof MoleculeViewer> = {
    productName,
    molecules,
    variant: "hero",
    className,
  };

  return <MoleculeViewer {...viewerProps} />;
}


