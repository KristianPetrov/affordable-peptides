import type { ReactNode } from "react";
import Link from "next/link";

import { NavBar } from "@ap/shared-ui";

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  summary: string;
  children: ReactNode;
};

export function LegalPageLayout ({
  title,
  lastUpdated,
  summary,
  children,
}: LegalPageLayoutProps)
{
  return (
    <div className="theme-page min-h-screen">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="theme-card-gradient rounded-3xl p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-purple-200">
              Compliance Policy
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-sm text-zinc-300 sm:text-base">{summary}</p>
            <p className="mt-4 text-xs text-zinc-400">Last updated: {lastUpdated}</p>
            <div className="mt-6">
              <Link
                href="/legal"
                className="inline-flex rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
              >
                View All Policies
              </Link>
            </div>
          </div>
          <article className="theme-surface space-y-6 rounded-3xl p-8 text-sm leading-7 text-zinc-200 sm:p-10 sm:text-base">
            {children}
          </article>
        </div>
      </main>
    </div>
  );
}
