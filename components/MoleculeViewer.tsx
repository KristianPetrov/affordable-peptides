"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  MoleculeDefinition,
  MoleculeStructureSource,
} from "@/lib/molecules";

type GLViewerInstance = {
  removeAllModels: () => void;
  removeAllShapes: () => void;
  removeAllSurfaces: () => void;
  addModel: (data: string, format: "pdb" | "sdf") => unknown;
  setBackgroundColor?: (color: string | number, alpha?: number) => void;
  setStyle: (selection: Record<string, unknown>, style: Record<string, unknown>) => void;
  addSurface: (surfaceType: number, style: Record<string, unknown>) => void;
  zoomTo: () => void;
  setSpin: (axisOrState: string | boolean, speed?: number) => void;
  spin: (axis: string, speed: number) => void;
  render: () => void;
};

type ThreeDMolGlobal = {
  GLViewer: new (
    element: HTMLElement,
    options?: Record<string, unknown>
  ) => GLViewerInstance;
  SurfaceType: Record<string, number>;
};

declare global
{
  interface Window
  {
    $3Dmol?: ThreeDMolGlobal;
  }
}

type ViewerVariant = "card" | "hero";
type ViewerStatus = "idle" | "loading" | "ready" | "error" | "missing";

type MoleculeViewerProps = {
  productName: string;
  molecules: MoleculeDefinition[];
  variant?: ViewerVariant;
  className?: string;
};

type LoadedStructure = {
  data: string;
  format: "pdb" | "sdf";
};

const moduleState: { promise: Promise<ThreeDMolGlobal> | null } = {
  promise: null,
};
const structureCache = new Map<string, LoadedStructure>();
type ThreeDMolModule = ThreeDMolGlobal & { default?: ThreeDMolGlobal };

const variantConfig: Record<
  ViewerVariant,
  {
    showControls: boolean;
    showCaption: boolean;
    overlayTone: string;
  }
> = {
  card: {
    showControls: true,
    showCaption: true,
    overlayTone: "text-purple-100",
  },
  hero: {
    showControls: false,
    showCaption: false,
    overlayTone: "text-purple-50",
  },
};

const spinnerDots = (
  <span className="relative inline-flex h-3 w-12 items-center justify-between">
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
  </span>
);

export default function MoleculeViewer ({
  productName,
  molecules,
  variant = "card",
  className = "",
}: MoleculeViewerProps)
{
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewerInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>(() =>
    molecules.length ? "idle" : "missing"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasRenderableArea, setHasRenderableArea] = useState(() =>
    typeof window === "undefined" || typeof ResizeObserver === "undefined"
  );

  useEffect(() =>
  {
    if (isInView) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
      {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (rootRef.current) {
      observer.observe(rootRef.current);
    }
    return () => observer.disconnect();
  }, [isInView]);

  useEffect(() =>
  {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() =>
  {
    if (typeof window === "undefined" || typeof ResizeObserver === "undefined") {
      return;
    }

    const target = canvasRef.current;
    if (!target) {
      return;
    }

    const updateSize = () =>
    {
      const rect = target.getBoundingClientRect();
      setHasRenderableArea(rect.width > 0 && rect.height > 0);
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(target);
    updateSize();

    return () =>
    {
      observer.disconnect();
    };
  }, []);

  useEffect(() =>
  {
    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    if (prefersReducedMotion) {
      viewer.setSpin(false);
    } else {
      viewer.spin("y", 0.9);
    }
  }, [prefersReducedMotion]);

  const clampedIndex = useMemo(() =>
  {
    if (!molecules.length) {
      return 0;
    }
    return Math.min(activeIndex, molecules.length - 1);
  }, [activeIndex, molecules]);

  const activeMolecule = molecules.length ? molecules[clampedIndex] : null;

  useEffect(() =>
  {
    if (
      !isInView ||
      !activeMolecule ||
      typeof window === "undefined" ||
      !hasRenderableArea
    ) {
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    async function load ()
    {
      setStatus("loading");
      setErrorMessage(null);
      try {
        const $3Dmol = await load3DMol();
        if (!isMounted || !canvasRef.current) {
          return;
        }

        if (!viewerRef.current) {
          viewerRef.current = new $3Dmol.GLViewer(canvasRef.current, {
            antialias: true,
          });
          if (viewerRef.current.setBackgroundColor) {
            viewerRef.current.setBackgroundColor("#000000", 0);
          }
        }

        const viewer = viewerRef.current;
        if (!activeMolecule) {
          setStatus("error");
          setErrorMessage("No active molecule selected.");
          return;
        }
        const { data, format } = await loadStructureData(
          activeMolecule,
          abortController.signal
        );

        viewer.removeAllModels();
        viewer.removeAllShapes();
        viewer.removeAllSurfaces();
        viewer.addModel(data, format);
        viewer.setStyle(
          {},
          {
            stick: {
              radius: 0.20,
              colorscheme: "Jmol",
            },
            sphere: {
              scale: 0.25,
              colorscheme: "Jmol",
            },
          }
        );
        viewer.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.08,
          color: "#c084fc",
        });
        viewer.zoomTo();
        if (prefersReducedMotion) {
          viewer.setSpin(false);
        } else {
          viewer.spin("y", 0.9);
        }
        viewer.render();
        if (isMounted) {
          setStatus("ready");
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        console.error(error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load molecular structure"
        );
      }
    }

    load();

    return () =>
    {
      isMounted = false;
      abortController.abort();
    };
  }, [activeMolecule, isInView, reloadToken, prefersReducedMotion, hasRenderableArea]);

  const effectiveStatus: ViewerStatus = molecules.length ? status : "missing";

  const config = variantConfig[variant];

  const statusLabel = useMemo(() =>
  {
    if (!molecules.length) {
      return "Structural data not configured";
    }
    switch (effectiveStatus) {
      case "loading":
        return `Loading ${activeMolecule?.displayName ?? "molecule"}...`;
      case "ready":
        return `Visualizing ${activeMolecule?.displayName ?? "molecule"}`;
      case "error":
        return errorMessage ?? "Unable to load structural data";
      case "missing":
        return "Structural data unavailable";
      default:
        return "Preparing viewer";
    }
  }, [effectiveStatus, activeMolecule, molecules.length, errorMessage]);

  const showRetry = effectiveStatus === "error";

  const overlayControls = variant === "card";
  const showSelector = config.showControls && molecules.length > 1;

  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-3 ${variant === "hero" ? "h-full" : ""} ${className}`}
    >
      <div
        className="relative flex-1 overflow-hidden rounded-[inherit] border border-purple-500/40 bg-linear-to-br from-[#200532] via-[#0f001d] to-[#05000b]"
      >
        <div
          ref={canvasRef}
          className="absolute inset-0"
          aria-label={`${productName} molecular visualization`}
          role="img"
        />
        {overlayControls && showSelector && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/80 via-black/35 to-transparent"
            aria-hidden
          />
        )}
        {(effectiveStatus !== "ready" || !activeMolecule) && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] ${config.overlayTone}`}
          >
            {effectiveStatus === "loading" ? spinnerDots : null}
            <span className="text-center text-[0.65rem] tracking-[0.25em]">
              {statusLabel}
            </span>
            {showRetry && (
              <button
                type="button"
                onClick={() => setReloadToken((prev) => prev + 1)}
                className="rounded-full border border-purple-300/50 px-3 py-1 text-[0.6rem] tracking-[0.3em] text-purple-50 transition hover:border-purple-200 hover:text-white"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {showSelector && (<>
        <div
          className={
            overlayControls
              ? "absolute bottom-3 left-3 right-3 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-purple-500/30 bg-black/35 p-2 backdrop-blur"
              : "flex flex-wrap gap-2"
          }
        >
          {molecules.map((molecule, index) =>
          {
            const isActive = index === clampedIndex;
            return (
              <button
                key={molecule.slug}
                type="button"
                className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${isActive
                  ? "border-purple-500 bg-purple-500/20 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                  : "border-purple-900/40 text-purple-200 hover:border-purple-400 hover:text-white"
                  }`}
                onClick={() => setActiveIndex(index)}
                aria-pressed={isActive}
              >
                {molecule.displayName}
              </button>
            );
          })} </div>

        <span className="text-xs text-purple-200">
          {statusLabel}
          {activeMolecule?.subtitle ? ` • ${activeMolecule.subtitle}` : ""}
        </span>
      </>
      )}

      {config.showCaption && (
        <div className="flex flex-col gap-1 text-xs text-zinc-400">
          <span className="font-semibold uppercase tracking-[0.3em] text-purple-200">
            Molecular Preview
          </span>
          <span>
            {statusLabel}
            {activeMolecule?.subtitle ? ` • ${activeMolecule.subtitle}` : ""}
          </span>
          {!molecules.length && (
            <span className="text-[0.65rem] text-zinc-500">
              Add a molecule entry for {productName} in lib/molecules.ts to
              enable the visualization.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function load3DMol (): Promise<ThreeDMolGlobal>
{
  if (typeof window === "undefined") {
    return Promise.reject(new Error("3Dmol requires a browser environment"));
  }

  if (window.$3Dmol) {
    return Promise.resolve(window.$3Dmol);
  }

  if (!moduleState.promise) {
    moduleState.promise = import("3dmol")
      .then((module) =>
      {
        const hydratedModule = module as unknown as ThreeDMolModule;
        const threeDMol = hydratedModule.default ?? hydratedModule;
        window.$3Dmol = threeDMol;
        return threeDMol;
      })
      .catch((error) =>
      {
        moduleState.promise = null;
        throw (error instanceof Error
          ? error
          : new Error("Unable to load 3Dmol module"));
      });
  }

  return moduleState.promise;
}

async function loadStructureData (
  molecule: MoleculeDefinition,
  signal: AbortSignal
): Promise<LoadedStructure>
{
  const cacheKey = JSON.stringify([
    molecule.slug,
    molecule.source,
    molecule.fallbackSource,
  ]);
  if (structureCache.has(cacheKey)) {
    return structureCache.get(cacheKey)!;
  }

  const primarySource = molecule.source;
  if (isRelativeLocalSource(primarySource)) {
    const localResult = await tryLoadLocalSource(primarySource, signal);
    if (localResult) {
      structureCache.set(cacheKey, localResult);
      return localResult;
    }
  } else if (!molecule.fallbackSource) {
    const directResult = await fetchStructureFromSource(primarySource, signal);
    structureCache.set(cacheKey, directResult);
    return directResult;
  }

  const remoteSource = !isRelativeLocalSource(primarySource)
    ? primarySource
    : molecule.fallbackSource;

  if (!remoteSource) {
    throw new Error(
      `Local structure for ${molecule.displayName} is missing and no fallback source is configured.`
    );
  }

  const remoteResult = await fetchStructureFromSource(remoteSource, signal);
  structureCache.set(cacheKey, remoteResult);
  return remoteResult;
}

function isRelativeLocalSource (
  source: MoleculeStructureSource
): source is Extract<MoleculeStructureSource, { type: "url" }>
{
  return source.type === "url" && source.url.startsWith("/");
}

async function tryLoadLocalSource (
  source: Extract<MoleculeStructureSource, { type: "url" }>,
  signal: AbortSignal
): Promise<LoadedStructure | null>
{
  try {
    const response = await fetch(source.url, { signal });
    if (!response.ok) {
      return null;
    }
    const data = await response.text();
    return { data, format: source.format };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw error;
    }
    console.warn(
      `Failed to load local molecular structure at ${source.url}`,
      error
    );
    return null;
  }
}

async function fetchStructureFromSource (
  source: MoleculeStructureSource,
  signal: AbortSignal
): Promise<LoadedStructure>
{
  switch (source.type) {
    case "pubchem":
      return fetchFromPubChem(source, signal);
    case "rcsb": {
      const pdbId = source.pdbId.toUpperCase();
      const url = `https://files.rcsb.org/download/${pdbId}.pdb`;
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`RCSB returned ${response.status} for ${pdbId}`);
      }
      const data = await response.text();
      return { data, format: "pdb" };
    }
    case "alphafold": {
      const url = `https://alphafold.ebi.ac.uk/files/AF-${source.uniprotId}-F1-model_v4.pdb`;
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(
          `AlphaFold returned ${response.status} for ${source.uniprotId}`
        );
      }
      const data = await response.text();
      return { data, format: "pdb" };
    }
    case "url": {
      const response = await fetch(source.url, { signal });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const data = await response.text();
      return { data, format: source.format };
    }
    default:
      throw new Error("Unsupported structure source");
  }
}

async function fetchFromPubChem (
  source: Extract<MoleculeStructureSource, { type: "pubchem" }>,
  signal: AbortSignal
): Promise<LoadedStructure>
{
  const queryType = source.queryType ?? "name";
  const recordPreference = source.recordType ?? "auto";
  const recordTypes: ("3d" | "2d")[] =
    recordPreference === "auto"
      ? ["3d", "2d"]
      : recordPreference === "3d"
        ? ["3d"]
        : ["2d"];
  const normalizedValue =
    queryType === "cid" ? source.query : encodeURIComponent(source.query);
  const querySegment =
    queryType === "cid" ? `cid/${normalizedValue}` : `name/${normalizedValue}`;
  let lastError: Error | null = null;
  for (const recordType of recordTypes) {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${querySegment}/SDF?record_type=${recordType}`;
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        lastError = new Error(
          `PubChem returned ${response.status} for ${source.query}`
        );
        continue;
      }
      const text = await response.text();
      if (text.trim()) {
        return { data: text, format: "sdf" };
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw error;
      }
      lastError =
        error instanceof Error ? error : new Error("PubChem request failed");
    }
  }
  throw (
    lastError ??
    new Error(`PubChem does not have a 3D record for ${source.query}`)
  );
}

