"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import NavBar from "@/components/NavBar";
import {
  featuredProducts,
  peptideProducts,
  type Product,
} from "@/lib/products";

const rotationIntervalMs = 5000;

type HighlightDetails = {
  variantLabel: string;
  quantity: string;
  priceDisplay: string;
};

function getHighlightDetails(product: Product): HighlightDetails | null {
  for (const variant of product.variants) {
    const tier = variant.tiers[0];
    if (tier) {
      return {
        variantLabel: variant.label,
        quantity: tier.quantity,
        priceDisplay: tier.price.startsWith("$")
          ? tier.price
          : `$${tier.price}`,
      };
    }
  }
  return null;
}

export default function Home() {
  const showcaseProducts = useMemo(() => {
    const featured = featuredProducts.slice(0, 3);
    if (featured.length === 3) {
      return featured;
    }

    const remaining =
      featured.length > 0
        ? peptideProducts.filter((product) => !product.isFeatured)
        : peptideProducts;

    return [...featured, ...remaining.slice(0, 3 - featured.length)];
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (showcaseProducts.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % showcaseProducts.length);
    }, rotationIntervalMs);

    return () => window.clearInterval(timer);
  }, [showcaseProducts.length]);

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
              Lab-Grade Standards. Real-World Prices.
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
              <Link
                href="/store"
                className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(120,48,255,0.35)] transition hover:bg-purple-500 hover:shadow-[0_16px_30px_rgba(120,48,255,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Visit the Store
              </Link>
              <Link
                href="#vision"
                className="rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold text-purple-200 transition hover:border-purple-400 hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Explore Our Vision
              </Link>
            </div>
          </div>
        </section>

        <section
          id="featured"
          className="relative px-6 sm:px-12 lg:px-16"
          aria-labelledby="featured-heading"
        >
          <div className="relative mx-auto max-w-6xl space-y-10">
            <div className="space-y-4 text-center">
              <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
                Featured Peptides
              </span>
              <h2
                id="featured-heading"
                className="text-3xl font-semibold text-white sm:text-4xl"
              >
                Top selections 
              </h2>
              <p className="mx-auto max-w-3xl text-balance text-base text-zinc-300 sm:text-lg">
                Explore our most requested products, curated for their purity,
                reliability, and results. Select a highlight to learn more in
                the full store.
              </p>
            </div>

            <div className="relative min-h-[440px] overflow-hidden rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#0b0014] to-black p-6 sm:p-10">
              {showcaseProducts.map((product, index) => {
                const isActive = index === activeIndex;
                const highlight = getHighlightDetails(product);

                return (
                  <article
                    key={product.name}
                    className={`absolute inset-0 mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-8 text-center transition duration-700 ease-out ${
                      isActive
                        ? "pointer-events-auto opacity-100 blur-0"
                        : "pointer-events-none opacity-0 blur-sm"
                    }`}
                    aria-hidden={!isActive}
                  >
                    <div className="relative h-56 w-56 overflow-hidden rounded-full border border-purple-500/60 bg-purple-500/10 shadow-[0_25px_80px_rgba(120,48,255,0.35)]">
                      <Image
                        src="/affordable-peptides-example-product.png"
                        alt={`${product.name} product example`}
                        fill
                        className="object-cover"
                        sizes="224px"
                      />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                        {product.name}
                      </h3>
                      {highlight ? (
                        <p className="text-sm text-zinc-300 sm:text-base">
                          Featured dosage:{" "}
                          <span className="font-semibold text-white">
                            {highlight.variantLabel}
                          </span>{" "}
                          • Qty {highlight.quantity} •{" "}
                          <span className="font-semibold text-purple-200">
                            {highlight.priceDisplay}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-300 sm:text-base">
                          Multiple dosages available—see all pricing in the
                          store.
                        </p>
                      )}
                    </div>
                    <Link
                      href="/store"
                      className="inline-flex items-center justify-center rounded-full border border-purple-500/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-purple-200 transition hover:border-purple-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                      View in Store
                    </Link>
                  </article>
                );
              })}
            </div>

            <div className="flex justify-center gap-3">
              {showcaseProducts.map((product, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={product.name}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-3 w-10 rounded-full transition ${
                      isActive
                        ? "bg-purple-500 shadow-[0_0_20px_rgba(120,48,255,0.55)]"
                        : "bg-purple-900/40 hover:bg-purple-700/60"
                    }`}
                    aria-label={`Showcase ${product.name}`}
                  />
                );
              })}
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

        <section
          id="contact"
          className="relative px-6 sm:px-12 lg:px-16"
          aria-labelledby="contact-heading"
        >
          <div className="relative mx-auto max-w-4xl">
            <div
              className="absolute inset-0 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black shadow-[0_25px_70px_rgba(70,0,110,0.45)]"
              aria-hidden
            />
            <div className="relative space-y-6 px-6 py-14 text-center sm:px-12 sm:py-16">
              <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
                Contact
              </span>
              <h2
                id="contact-heading"
                className="text-3xl font-semibold text-white sm:text-4xl"
              >
                Talk With Affordable Peptides
              </h2>
              <p className="mx-auto max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
                Have a question about sourcing, availability, or lab partnership
                opportunities? Reach out anytime and we&apos;ll get back to you
                quickly.
              </p>
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-purple-900/60 bg-black/60 p-6">
                <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                  Phone
                </span>
                <a
                  href="tel:9515393821"
                  className="text-2xl font-semibold text-white transition hover:text-purple-200"
                >
                  (951) 539-3821
                </a>
                <p className="text-xs text-zinc-500">
                  Available daily 9am–7pm PST. Leave a message after hours and
                  we&apos;ll return your call.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

