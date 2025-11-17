"use client";

import Image from "next/image";
import { useMemo, type CSSProperties } from "react";

type ProductMockupSize = "sm" | "md" | "lg" | "full";

export type ProductMockupProps = {
  labelSrc: string;
  productName?: string;
  labelAlt?: string;
  bottleSrc?: string;
  className?: string;
  priority?: boolean;
  size?: ProductMockupSize;
  labelAspectRatio?: number;
  labelScale?: number;
  labelYOffset?: number;
  labelXOffset?: number;
  labelRotation?: number;
  glow?: boolean;
  labelVisibleWidth?: number;
};

const DEFAULT_BOTTLE_SRC = "/products/mock-peptide-bottle.png";
const DEFAULT_LABEL_ASPECT_RATIO = 803 / 356;
const DEFAULT_LABEL_SCALE = 1.29;
const DEFAULT_LABEL_Y = 0.56;
const DEFAULT_LABEL_X = 0.5;
const DEFAULT_LABEL_VISIBLE_WIDTH = 0.389;
const MIN_VISIBLE_WIDTH = 0.35;

const sizeClassMap: Record<ProductMockupSize, string> = {
  sm: "max-w-[180px]",
  md: "max-w-[260px]",
  lg: "max-w-[340px]",
  full: "w-full",
};

const sizeImageMap: Record<ProductMockupSize, string> = {
  sm: "(max-width: 768px) 50vw, 160px",
  md: "(max-width: 768px) 60vw, 220px",
  lg: "(max-width: 768px) 70vw, 320px",
  full: "(max-width: 768px) 95vw, 420px",
};

export default function ProductMockup({
  labelSrc,
  productName,
  labelAlt,
  bottleSrc = DEFAULT_BOTTLE_SRC,
  className = "",
  priority,
  size = "md",
  labelAspectRatio = DEFAULT_LABEL_ASPECT_RATIO,
  labelScale = DEFAULT_LABEL_SCALE,
  labelYOffset = DEFAULT_LABEL_Y,
  labelXOffset = DEFAULT_LABEL_X,
  labelRotation = 0,
  glow = true,
  labelVisibleWidth = DEFAULT_LABEL_VISIBLE_WIDTH,
}: ProductMockupProps) {
  const containerClassName = useMemo(() => {
    const base = "relative isolate aspect-[2/3] w-full";
    const sizeClass = sizeClassMap[size] ?? sizeClassMap.md;
    return [base, sizeClass, className].filter(Boolean).join(" ");
  }, [className, size]);

  const resolvedBottleAlt =
    labelAlt ??
    `${productName ? `${productName} ` : ""}peptide mock bottle label`;

  if (!labelSrc) {
    return (
      <div className={containerClassName}>
        <div className="flex h-full w-full items-center justify-center rounded-[32px] border border-purple-900/40 bg-black/70 text-center text-xs uppercase tracking-[0.3em] text-purple-200">
          Missing label
        </div>
      </div>
    );
  }

  const clampedVisibleWidth = Math.min(
    Math.max(labelVisibleWidth, MIN_VISIBLE_WIDTH),
    1
  );
  const labelCrop = ((1 - clampedVisibleWidth) / 2) * 100;

  const labelWrapperStyle: CSSProperties = {
    width: `${Math.min(Math.max(labelScale, 0.2), 1) * 100}%`,
    top: `${Math.min(Math.max(labelYOffset, 0.15), 0.85) * 100}%`,
    left: `${Math.min(Math.max(labelXOffset, 0), 1) * 100}%`,
    transform: `translate(-50%, -50%) rotate(${labelRotation}deg)`,
  };

  return (
    <div className={containerClassName}>
      {glow ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-5 rounded-[40px] bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.45),_transparent_65%)] blur-3xl opacity-70"
        />
      ) : null}
      <div className="absolute inset-[6%] rounded-[36px] bg-gradient-to-b from-[#12001f] via-[#06000b] to-black" />
      <div className="absolute inset-x-6 top-[10%] h-16 rounded-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent blur-3xl opacity-60" />
      <div className="absolute inset-0">
        <Image
          src={bottleSrc}
          alt={resolvedBottleAlt}
          fill
          priority={priority}
          sizes={sizeImageMap[size] ?? sizeImageMap.md}
          className="object-contain drop-shadow-[0_25px_60px_rgba(15,0,45,0.65)]"
        />
      </div>
      <div
        className="absolute origin-center"
        style={labelWrapperStyle}
        aria-hidden
      >
        <div
          className="relative w-full overflow-hidden drop-shadow-[0_18px_25px_rgba(0,0,0,0.45)]"
          style={{
            aspectRatio: `${labelAspectRatio}`,
            clipPath: `inset(0 ${labelCrop}% 0 ${labelCrop}%)`,
            WebkitClipPath: `inset(0 ${labelCrop}% 0 ${labelCrop}%)`,
          }}
        >
          <Image
            src={labelSrc}
            alt={labelAlt ?? `${productName ?? "Peptide"} label`}
            fill
            sizes={sizeImageMap[size] ?? sizeImageMap.md}
            className="object-cover"
            priority={priority}
          />
          <div className="pointer-events-none absolute inset-0 rounded-[6%/12%] bg-gradient-to-r from-black/35 via-transparent to-black/25 mix-blend-multiply" />
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
              maskImage:
                "radial-gradient(circle at left, transparent 45%, black 95%)",
              WebkitMaskImage:
                "radial-gradient(circle at left, transparent 45%, black 95%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15), rgba(0,0,0,0.55))",
              maskImage:
                "radial-gradient(circle at right, transparent 45%, black 95%)",
              WebkitMaskImage:
                "radial-gradient(circle at right, transparent 45%, black 95%)",
            }}
          />
        </div>
      </div>
      <div className="absolute inset-x-[18%] bottom-[16%] h-6 rounded-full bg-black/50 blur-2xl" aria-hidden />
    </div>
  );
}


