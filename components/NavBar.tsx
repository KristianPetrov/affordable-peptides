"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "#mission", label: "Mission" },
  { href: "#vision", label: "Vision" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-purple-900/40 bg-black/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-12 lg:px-16">
        <Link
          href="/"
          className="group inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-200 transition hover:text-white"
          onClick={closeMenu}
        >
          <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600/40 via-purple-500/10 to-purple-900/40 shadow-[0_10px_35px_rgba(88,28,135,0.45)]">
            <Image
              src="/affordable-peptides-logo-transparent.png"
              alt="Affordable Peptides"
              width={80}
              height={80}
              className="h-12 w-12 object-contain"
              priority
            />
          </span>
          <span className="hidden sm:inline-flex text-xs font-semibold uppercase tracking-[0.35em] text-purple-200 transition group-hover:text-white">
            Affordable Peptides
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-200 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <span className="rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200 shadow-[0_10px_25px_rgba(120,48,255,0.35)]">
            Store Coming Soon
          </span>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-purple-500/50 bg-black/60 text-purple-200 transition hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black md:hidden"
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
        className={`md:hidden transition-all duration-200 ${
          menuOpen
            ? "pointer-events-auto max-h-96 opacity-100"
            : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="mx-6 mb-6 flex flex-col gap-4 rounded-2xl border border-purple-900/40 bg-black/90 px-6 py-6 text-sm font-medium text-zinc-200 shadow-[0_18px_40px_rgba(60,0,100,0.45)] sm:mx-12 lg:mx-16">
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
          <div className="rounded-2xl border border-purple-500/50 bg-purple-500/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-purple-200">
            Store coming soon
          </div>
        </div>
      </div>
    </header>
  );
}

