import Link from "next/link";

import
{
  reviews,
  AGGREGATE_RATING,
  TOTAL_REVIEW_COUNT,
  BUSINESS_REVIEW_URL,
  TRUSTPILOT_PROFILE_URL,
  type Review,
} from "@/lib/reviews";

const TRUSTPILOT_ICON_URL = "https://images-static.trustpilot.com/api/icons/230x230.png";

/* ------------------------------------------------------------------ */
/*  Trustpilot branding helpers                                        */
/* ------------------------------------------------------------------ */

function StarIcon ({ filled, half }: { filled?: boolean; half?: boolean })
{
  if (half) {
    return (
      <span className="relative inline-flex h-5 w-5 rounded-[3px]" aria-hidden="true">
        <img
          src={TRUSTPILOT_ICON_URL}
          alt=""
          className="absolute inset-0 h-5 w-5 rounded-[3px] opacity-25 grayscale"
          loading="lazy"
          decoding="async"
        />
        <span className="relative h-full w-1/2 overflow-hidden">
          <img
            src={TRUSTPILOT_ICON_URL}
            alt=""
            className="h-5 w-5 max-w-none"
            loading="lazy"
            decoding="async"
          />
        </span>
      </span>
    );
  }

  return (
    <img
      src={TRUSTPILOT_ICON_URL}
      alt=""
      aria-hidden="true"
      className={`h-5 w-5 rounded-[3px] ${filled ? "" : "opacity-25 grayscale"}`}
      loading="lazy"
      decoding="async"
    />
  );
}

function TrustpilotLogoIcon ({ className }: { className?: string })
{
  return (
    <img
      src={TRUSTPILOT_ICON_URL}
      alt=""
      aria-hidden="true"
      className={className ?? "h-4 w-4 rounded-[2px]"}
      loading="lazy"
      decoding="async"
    />
  );
}

function Stars ({ rating }: { rating: number })
{
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const roundUp = rating - full >= 0.75;
  const totalFull = roundUp ? full + 1 : full;

  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) =>
      {
        if (i < totalFull) return <StarIcon key={i} filled />;
        if (i === totalFull && hasHalf) return <StarIcon key={i} half />;
        return <StarIcon key={i} />;
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Trustpilot wordmark                                                */
/* ------------------------------------------------------------------ */

function TrustpilotWordmark ()
{
  const url = TRUSTPILOT_PROFILE_URL ?? BUSINESS_REVIEW_URL;
  const inner = (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold tracking-wide">
      <TrustpilotLogoIcon />
      <span className="text-[#00b67a]">Trustpilot</span>
    </span>
  );

  if (url) {
    return (
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="transition hover:opacity-80"
        aria-label="View Affordable Peptides on Trustpilot"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}

/* ------------------------------------------------------------------ */
/*  Individual review card                                             */
/* ------------------------------------------------------------------ */

function ReviewCard ({ review }: { review: Review })
{
  const initials = review.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-purple-900/50 bg-linear-to-br from-[#110019]/80 via-black/60 to-[#0a0010]/80 p-6 shadow-[0_12px_35px_rgba(50,0,90,0.3)] transition hover:border-purple-700/60 hover:shadow-[0_16px_45px_rgba(60,0,110,0.4)]">
      {/* Stars */}
      <Stars rating={review.rating} />

      {/* Body */}
      <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-300">
        &ldquo;{review.body}&rdquo;
      </p>

      {/* Reviewer */}
      <div className="mt-5 flex items-center gap-3 border-t border-purple-900/40 pt-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-200">
          {initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{review.name}</p>
          <p className="text-xs text-zinc-500">{review.date}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export default function ReviewsSection ()
{
  if (reviews.length === 0) return null;

  return (
    <section
      id="reviews"
      className="relative px-6 sm:px-12 lg:px-16"
      aria-labelledby="reviews-heading"
    >
      <div className="relative mx-auto max-w-6xl space-y-10">
        {/* Header */}
        <div className="space-y-5 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-emerald-200">
            Trusted by Researchers
          </span>

          <h2
            id="reviews-heading"
            className="text-3xl font-semibold text-white sm:text-4xl"
          >
            What Our Customers Say
          </h2>

          {/* Aggregate rating row */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <Stars rating={AGGREGATE_RATING} />
              <span className="text-lg font-bold text-white">
                {AGGREGATE_RATING.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-zinc-400">
              Based on{" "}
              <span className="font-semibold text-zinc-200">
                {TOTAL_REVIEW_COUNT}
              </span>{" "}
              {TOTAL_REVIEW_COUNT === 1 ? "review" : "reviews"} on{" "}
              <TrustpilotWordmark />
            </p>
          </div>
        </div>

        {/* Review cards grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {TRUSTPILOT_PROFILE_URL && (
            <Link
              href={TRUSTPILOT_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
            >
              <TrustpilotLogoIcon className="h-4 w-4 rounded-[2px]" />
              Read All Reviews
            </Link>
          )}
          {BUSINESS_REVIEW_URL && (
            <Link
              href={BUSINESS_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#00b67a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_25px_rgba(0,182,122,0.3)] transition hover:bg-[#00a06a] hover:shadow-[0_14px_30px_rgba(0,182,122,0.4)]"
            >
              Leave a Review
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
