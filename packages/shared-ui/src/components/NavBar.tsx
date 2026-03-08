"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useSharedUiAdapters } from "@ap/shared-ui/adapters";

const links = [
  { href: "/store", label: "Store" },
  { href: "/order-lookup", label: "Find Order" },
  { href: "/legal", label: "Policies" },
  { href: "/#mission", label: "Mission" },
  { href: "/#vision", label: "Vision" },
  { href: "/#contact", label: "Contact" },
];

function ThemeToggleFallback({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`theme-surface inline-flex h-11 w-11 shrink-0 rounded-full border ${className}`}
    />
  );
}

const ThemeToggle = dynamic(
  () => import("./ThemeToggle").then((mod) => mod.ThemeToggle),
  {
    ssr: false,
    loading: () => <ThemeToggleFallback />,
  }
);

export default function NavBar ()
{
  const { support } = useSharedUiAdapters();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();
  const role = String(session?.user?.role ?? "").toUpperCase();

  const accountLink = session?.user
    ? role === "ADMIN"
      ? { href: "/admin", label: "Admin" }
      : { href: "/account", label: "Account" }
    : { href: "/account/login", label: "Login" };

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="theme-footer sticky top-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-12 lg:px-16">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-foreground transition hover:text-(--foreground-strong)"
            onClick={closeMenu}
          >
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-purple-600/40 via-purple-500/10 to-purple-900/40 shadow-[0_10px_35px_rgba(88,28,135,0.45)]">
              <Image
                src="/affordable-peptides-new-logo-transparent.png"
                alt="Affordable Peptides"
                width={48}
                height={48}
                sizes="48px"
                fetchPriority="low"
                className="h-12 w-12 object-contain"
              />
            </span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.35em] text-(--accent) transition group-hover:text-(--foreground-strong) sm:inline-flex">
              Affordable Peptides
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground transition hover:text-(--foreground-strong)"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={accountLink.href}
              className="text-sm font-medium text-foreground transition hover:text-(--foreground-strong)"
            >
              {accountLink.label}
            </Link>
            <ThemeToggle />
            <Link
              href={support.smsLink}
              className="rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200 shadow-[0_10px_25px_rgba(120,48,255,0.35)] transition hover:border-purple-400 hover:text-white"
            >
              Text {support.phoneDisplay}
            </Link>
          </div>

          <button
            type="button"
            className="theme-surface theme-focus-offset inline-flex h-11 w-11 items-center justify-center rounded-full border text-(--accent) transition hover:text-(--foreground-strong) focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 md:hidden"
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {menuOpen ? (
                <>
                  <path d="M6 6L18 18" />
                  <path d="M6 18L18 6" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </nav>

        <div
          id="mobile-nav"
          className={`md:hidden transition-all duration-200 ${menuOpen
            ? "pointer-events-auto max-h-96 opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
            }`}
        >
          <div className="theme-surface mx-6 mb-6 flex flex-col gap-4 rounded-2xl px-6 py-6 text-sm font-medium text-foreground sm:mx-12 lg:mx-16">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-purple-500/50 px-4 py-2 text-center transition hover:border-purple-400 hover:text-white"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={accountLink.href}
              className="rounded-full border border-purple-500/50 px-4 py-2 text-center transition hover:border-purple-400 hover:text-white"
              onClick={closeMenu}
            >
              {accountLink.label}
            </Link>
            <Link
              href={support.smsLink}
              className="rounded-2xl border border-purple-500/50 bg-purple-500/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-purple-200 transition hover:border-purple-400 hover:text-white"
              onClick={closeMenu}
            >
              Text {support.phoneDisplay}
            </Link>
          </div>
        </div>
      </header>

      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-60 md:hidden">
        <ThemeToggle />
      </div>
    </>
  );
}

