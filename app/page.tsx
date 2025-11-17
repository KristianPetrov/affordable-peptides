import Image from "next/image";

import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="space-y-24 pb-24">
        <section className="relative isolate overflow-hidden px-6 pt-28 pb-32 sm:px-12 lg:px-16">
          <div
            className="absolute inset-0 bg-gradient-to-b from-black via-[#140018] to-black"
            aria-hidden
          />
          <div
            className="hero-fire pointer-events-none absolute left-1/2 top-[46%] h-[620px] w-[420px] -translate-x-1/2 -translate-y-1/2 sm:top-[44%] sm:h-[700px] sm:w-[460px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,63,255,0.25),_transparent_65%)] mix-blend-screen"
            aria-hidden
          />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
              Store Coming Soon!
            </span>
            <Image
              src="/affordable-peptides-logo-transparent.png"
              alt="Affordable Peptides logo"
              width={720}
              height={360}
              priority
              className="h-auto w-full max-w-[480px] drop-shadow-[0_0_35px_rgba(168,85,247,0.45)]"
            />
            <h1 className="mt-10 max-w-3xl text-balance text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              High-purity, research-grade peptides delivered with honesty,
              transparency, and uncompromising quality.
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
              Affordable Peptides brings together rigorous science, transparent
              third-party testing, and fair pricing so you can focus on what
              matters most—advancing results that make a difference.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#mission"
                className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(120,48,255,0.35)] transition hover:bg-purple-500 hover:shadow-[0_16px_30px_rgba(120,48,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Learn Our Mission
              </a>
              <a
                href="#vision"
                className="rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Explore Our Vision
              </a>
            </div>
          </div>
        </section>

        <section
          id="mission"
          className="relative px-6 sm:px-12 lg:px-16"
          aria-labelledby="mission-heading"
        >
          <div className="relative mx-auto max-w-5xl">
            <div
              className="absolute inset-0 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#13001f] via-[#080008] to-black shadow-[0_25px_70px_rgba(70,0,110,0.45)]"
              aria-hidden
            />
            <div className="relative space-y-6 px-6 py-14 sm:px-12 sm:py-16">
              <h2
                id="mission-heading"
                className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-300"
              >
                Mission Statement
              </h2>
              <p className="text-lg leading-8 text-zinc-200 sm:text-xl">
                Affordable Peptides exists to make high-quality, research-grade
                peptides accessible without the inflated pricing or industry
                smoke-and-mirrors. Our mission is to deliver reliable purity,
                transparent third-party testing, and clear information so
                customers can make informed decisions with confidence. We
                combine integrity, science, and responsible practices to raise
                the standard for the entire peptide space.
              </p>
            </div>
          </div>
        </section>

        <section
          id="vision"
          className="px-6 sm:px-12 lg:px-16"
          aria-labelledby="vision-heading"
        >
          <div className="mx-auto max-w-5xl space-y-6 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-black via-[#090011] to-[#1d0029] px-6 py-14 shadow-[0_20px_60px_rgba(45,0,95,0.45)] sm:px-12 sm:py-16">
            <h2
              id="vision-heading"
              className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-300"
            >
              Vision Statement
            </h2>
            <p className="text-lg leading-8 text-zinc-200 sm:text-xl">
              We aim to become the most trusted name in affordable, high-purity
              peptides by proving that transparency and quality should never be
              out of reach. Our vision is a future where anyone seeking to
              improve their research, wellness, or performance has access to
              safe, consistent, and responsibly verified products. Affordable
              Peptides is committed to leading the industry with honesty,
              innovation, and a straightforward, no-nonsense approach that sets
              a new bar for trust and reliability.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
