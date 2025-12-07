import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import Disclaimer from "@/components/Disclaimer";
import NavBar from "@/components/NavBar";
import HeroShowcase from "@/components/home/HeroShowcase";
import MissionSection from "@/components/home/MissionSection";
import ResearchSection from "@/components/home/ResearchSection";
import VisionSection from "@/components/home/VisionSection";
import {
  featuredProducts,
  peptideProducts,
  type Product,
} from "@/lib/products";
import { absoluteUrl, siteMetadata } from "@/lib/seo";

const homeUrl = absoluteUrl("/");
const socialPreviewUrl = absoluteUrl(siteMetadata.socialImagePath);

export const metadata: Metadata = {
  title: siteMetadata.name,
  description: siteMetadata.description,
  keywords: [...siteMetadata.keywords],
  alternates: {
    canonical: homeUrl,
  },
  openGraph: {
    title: siteMetadata.name,
    description: siteMetadata.description,
    type: "website",
    url: homeUrl,
    siteName: siteMetadata.name,
    images: [
      {
        url: socialPreviewUrl,
        width: 1200,
        height: 630,
        alt: "Affordable Peptides hero graphic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteMetadata.name,
    description: siteMetadata.description,
    images: [socialPreviewUrl],
  },
};

function getShowcaseProducts(): Product[] {
  const prioritySlug = "tirzepatide";
  const featured = [...featuredProducts];
  const priorityProduct = featured.find((product) => product.slug === prioritySlug);
  const orderedFeatured = priorityProduct
    ? [priorityProduct, ...featured.filter((product) => product.slug !== prioritySlug)]
    : featured;

  const selection = orderedFeatured.slice(0, 3);
  if (selection.length === 3) {
    return selection;
  }

  const remainingPool = peptideProducts.filter(
    (product) => !selection.some((selected) => selected.slug === product.slug)
  );

  return [...selection, ...remainingPool.slice(0, 3 - selection.length)];
}

export default function Home() {
  const showcaseProducts = getShowcaseProducts();

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
                Explore our most requested products, curated for their popularity,
                reliability, and results. Select a highlight to learn more in
                the full store.
              </p>
            </div>

            <HeroShowcase products={showcaseProducts} />
          </div>
        </section>
        <ResearchSection />
        <MissionSection />
        <VisionSection />


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
                Have a question about products, availability, or lab partnership
                opportunities? Reach out anytime and we&apos;ll get back to you
                quickly.
              </p>
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-purple-900/60 bg-black/60 p-6">
                <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                Text
                </span>
                <a
                href="sms:9515393821"
                className="text-2xl font-semibold text-white transition hover:text-purple-200"
                >
                Text (951) 539-3821
                </a>
                <p className="text-xs text-zinc-500">
                Available daily 6am–9pm PST. Send a text after hours and
                we&apos;ll get back to you promptly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 sm:px-12 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <Disclaimer />
          </div>
        </section>
      </main>
    </div>
  );
}

