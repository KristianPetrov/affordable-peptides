"use client";

import { useTheme } from "next-themes";

const srOnlyStyles = "sr-only";
const buttonStyles =
  "theme-surface theme-focus-offset inline-flex h-11 w-11 items-center justify-center rounded-full border text-[color:var(--accent)] transition hover:-translate-y-0.5 hover:[background:var(--surface-strong)] hover:text-[color:var(--foreground-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const label =
    resolvedTheme == null
      ? "Toggle color theme"
      : isDark
        ? "Switch to light mode"
        : "Switch to dark mode";

  return (
    <button
      type="button"
      className={buttonStyles}
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      <span className={srOnlyStyles}>{label}</span>
      {isDark ? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5" />
          <path d="M12 19.5V22" />
          <path d="m4.93 4.93 1.77 1.77" />
          <path d="m17.3 17.3 1.77 1.77" />
          <path d="M2 12h2.5" />
          <path d="M19.5 12H22" />
          <path d="m4.93 19.07 1.77-1.77" />
          <path d="m17.3 6.7 1.77-1.77" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
