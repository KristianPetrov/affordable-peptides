import type { Metadata } from "next";
import type { SVGProps } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Disclaimer,
  HeroShowcase,
  MissionSection,
  NavBar,
  ResearchSection,
  VisionSection,
} from "@ap/shared-ui";
import
{
  featuredProducts,
  peptideProducts,
  type Product,
} from "@/lib/products";
import { getCompliantProduct } from "@/lib/compliance";
import {
  LABORATORY_USE_ONLY_NOTICE,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_SMS_LINK,
  WEBSITE_RESEARCH_DISCLAIMER,
} from "@ap/shared-core";
import { absoluteUrl, siteMetadata } from "@/lib/seo";

type IconProps = SVGProps<SVGSVGElement>;

function TikTokIcon (props: IconProps)
{
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21 7.5c-1.9-.1-3.7-.9-5.1-2.2v8.9c0 3.6-2.9 6.5-6.5 6.5S3 17.8 3 14.2c0-3.1 2.2-5.8 5.2-6.4v3.4c-1.1.5-1.8 1.6-1.8 3 0 1.8 1.4 3.2 3.2 3.2s3.2-1.4 3.2-3.2V2h3.6c.4 1.9 1.9 3.4 3.8 3.8V7.5z" />
    </svg>
  );
}

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

function getShowcaseProducts (): Product[]
{
  const prioritySlug = "tirzepatide";
  const featured = [...featuredProducts];
  const priorityProduct = featured.find((product) => product.slug === prioritySlug);
  const orderedFeatured = priorityProduct
    ? [priorityProduct, ...featured.filter((product) => product.slug !== prioritySlug)]
    : featured;

  const selection = orderedFeatured.slice(0, 3);
  if (selection.length === 3) {
    return selection.map(getCompliantProduct);
  }

  const remainingPool = peptideProducts.filter(
    (product) => !selection.some((selected) => selected.slug === product.slug)
  );

  return [...selection, ...remainingPool.slice(0, 3 - selection.length)].map(
    getCompliantProduct
  );
}

export default function Home ()
{
  const showcaseProducts = getShowcaseProducts();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="space-y-24 pb-24">
        <section className="relative isolate overflow-hidden px-6 pt-28 pb-32 sm:px-12 lg:px-16">
          <div
            className="absolute inset-0 bg-linear-to-b from-black via-[#140018] to-black"
            aria-hidden
          />
          <div
            className="hero-fire pointer-events-none absolute left-1/2 top-[46%] h-[620px] w-[420px] -translate-x-1/2 -translate-y-1/2 sm:top-[44%] sm:h-[700px] sm:w-[460px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-linear(circle_at_top,rgba(148,63,255,0.25),transparent_65%)] mix-blend-screen"
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
              Lab-Grade Standards. Transparent Catalog Pricing.
            </span>
            <Image
              src="/affordable-peptides-new-logo-transparent.png"
              alt="Affordable Peptides logo"
              width={720}
              height={360}
              loading="lazy"
              quality={70}
              sizes="(max-width: 640px) 320px, (max-width: 1024px) 420px, 480px"
              className="h-auto w-full max-w-[480px] drop-shadow-[0_0_35px_rgba(168,85,247,0.45)]"
            />
            <h1 className="mt-10 max-w-3xl text-balance text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              Laboratory research materials with transparent documentation and
              research-use-only compliance.
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
              Affordable Peptides catalogs peptides and related laboratory
              materials for academic, institutional, and analytical research.
              Review package options, analytical certificates, and the
              research-use-only notices before ordering.
            </p>
            <div className="mt-6 max-w-3xl rounded-3xl border border-purple-900/60 bg-black/50 px-6 py-4 text-sm text-zinc-300">
              <p>{WEBSITE_RESEARCH_DISCLAIMER}</p>
              <p className="mt-2">{LABORATORY_USE_ONLY_NOTICE}</p>
            </div>
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
                Research Materials
              </span>
              <h2
                id="featured-heading"
                className="text-3xl font-semibold text-white sm:text-4xl"
              >
                Catalog highlights
              </h2>
              <p className="mx-auto max-w-3xl text-balance text-base text-zinc-300 sm:text-lg">
                Review a selection of cataloged materials and open the full
                store for package details, analytical references, and current
                availability.
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
              className="absolute inset-0 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black shadow-[0_25px_70px_rgba(70,0,110,0.45)]"
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
                Research Support
              </h2>
              <p className="mx-auto max-w-2xl text-balance text-base text-zinc-300 sm:text-lg">
                Contact us with catalog, availability, or documentation
                questions related to laboratory, academic, or institutional
                research orders.
              </p>
              <div className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-purple-900/60 bg-black/60 p-6 text-center">
                  <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                    Text
                  </span>
                  <a
                    href={SUPPORT_SMS_LINK}
                    className="text-2xl font-semibold text-white transition hover:text-purple-200"
                  >
                    Text {SUPPORT_PHONE_DISPLAY}
                  </a>
                  <p className="text-xs text-zinc-400">
                    Available daily 6am-9pm PST for catalog and documentation
                    questions.
                  </p>
                </div>
                <div className="rounded-2xl border border-purple-900/60 bg-black/60 p-6 text-left">
                  <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                    Social
                  </span>
                  <p className="mt-2 text-sm text-zinc-400">
                    Follow the lab for research updates, documentation notes, and
                    education.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={siteMetadata.socialProfiles.tiktok}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="TikTok (@affordablepeps)"
                      className="flex items-center gap-4 rounded-xl border border-purple-800/50 bg-purple-500/5 px-4 py-3 text-sm text-white transition hover:border-purple-400 hover:bg-purple-500/10"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-200">
                        <TikTokIcon className="h-5 w-5" />
                      </span>
                      <span>
                        TikTok
                        <span className="block text-xs font-semibold uppercase tracking-[0.35em] text-purple-200">
                          @affordablepeps
                        </span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-purple-900/60 bg-black/60 p-6 text-left">
                <span className="text-sm uppercase tracking-[0.35em] text-purple-200">
                  Compliance Notice
                </span>
                <p className="mt-2 text-sm text-zinc-400">
                  Orders are accepted only for research and identification
                  purposes within laboratory, academic, or institutional
                  settings.
                </p>
                <div className="mt-4 rounded-2xl border border-purple-800/50 bg-purple-500/5 px-4 py-4 text-sm text-zinc-300">
                  <p>{WEBSITE_RESEARCH_DISCLAIMER}</p>
                  <p className="mt-3">{LABORATORY_USE_ONLY_NOTICE}</p>
                </div>
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

