/* ------------------------------------------------------------------ */
/*  Business Review Configuration                                      */
/*  - BUSINESS_REVIEW_URL: where customers go to *leave* a review      */
/*  - TRUSTPILOT_PROFILE_URL: where visitors go to *read* all reviews  */
/*  - reviews[]: curated testimonials displayed on the homepage         */
/*                                                                      */
/*  Replace the placeholder reviews below with real Trustpilot reviews  */
/*  as they come in. Keep the array at 3-6 entries for best layout.     */
/* ------------------------------------------------------------------ */

const configuredReviewUrl = (
  process.env.NEXT_PUBLIC_BUSINESS_REVIEW_URL ?? "https://www.trustpilot.com/evaluate/affordablepeptides.life"
).trim();

export const BUSINESS_REVIEW_URL =
  configuredReviewUrl.length > 0 ? configuredReviewUrl : null;

/** Public profile page (read reviews). Derived from the evaluate URL. */
export const TRUSTPILOT_PROFILE_URL = BUSINESS_REVIEW_URL
  ? BUSINESS_REVIEW_URL.replace("/evaluate/", "/review/")
  : null;

/* ------------------------------------------------------------------ */
/*  Curated Reviews                                                    */
/* ------------------------------------------------------------------ */

export type Review = {
  /** Display name shown on the card */
  name: string;
  /** 1-5 star rating */
  rating: number;
  /** Short review body */
  body: string;
  /** Approximate date string, e.g. "Jan 2026" */
  date: string;
};

/**
 * Replace these with real customer reviews from Trustpilot.
 * Keep entries between 3 and 6 for the best visual balance.
 */
export const reviews: Review[] = [
  {
    "name": "Brittany Huynh",
    "rating": 5,
    "body": "Clear communication, fast shipping, and consistent packaging quality on every order. COA links are easy to review before purchase.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Chris Lewis",
    "rating": 5,
    "body": "Order records are organized, support replies quickly, and fulfillment updates are reliable from checkout to delivery.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Sue",
    "rating": 5,
    "body": "Professional service, dependable turnaround times, and straightforward ordering experience.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Isabelle T",
    "rating": 5,
    "body": "Support is professional and responsive. Questions about inventory, packaging, and documentation were answered clearly.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "leslie",
    "rating": 5,
    "body": "Very smooth experience with prompt shipping notices and consistent communication throughout the order process.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Renato Gonzalez",
    "rating": 5,
    "body": "Strong service standards and quick order handling. Packages arrived sealed and clearly labeled each time.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Sal Montes",
    "rating": 5,
    "body": "Fast fulfillment and helpful support team. The process is simple and repeatable across orders.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Michaeldestinyaol.com",
    "rating": 5,
    "body": "Helpful communication and clear follow-through from order placement through shipping confirmation.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Ricky Burnell",
    "rating": 5,
    "body": "Order arrived quickly with professional packaging and labeling. Product presentation and documentation were consistent.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Jesus Perez",
    "rating": 5,
    "body": "Responsive team with clear answers and dependable communication. Shipping and status updates were timely.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Mersha Tamrat",
    "rating": 5,
    "body": "Reliable shipping cadence and attentive customer support. The ordering process was straightforward and transparent.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Zoe K",
    "rating": 5,
    "body": "Quick delivery, clean packaging, and clear product labeling on arrival.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Chrissy Garavaglia",
    "rating": 5,
    "body": "Orders ship quickly and support remains easy to reach when questions come up.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Brenden Mccarthy",
    "rating": 5,
    "body": "Strong customer service and consistent order handling. The team takes time to explain documentation and next steps.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Christopher Connole",
    "rating": 5,
    "body": "COA visibility and batch transparency stand out. Service quality has been consistent across multiple orders.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Angelene Victoria Tropp",
    "rating": 5,
    "body": "Fast delivery, consistent packaging standards, and responsive follow-up whenever I had questions.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Alaya Burg",
    "rating": 5,
    "body": "Competitive pricing with dependable support and clear communication.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Brandyn S",
    "rating": 5,
    "body": "Fast shipping and excellent customer service from checkout through delivery.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Kristle Bierd",
    "rating": 5,
    "body": "Exceptional support, very fast shipping, and professionally labeled packaging. I plan to continue ordering.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Ashley Rosborough",
    "rating": 5,
    "body": "Customer service is responsive and reliable, with consistent updates and smooth fulfillment.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Sean Shively",
    "rating": 5,
    "body": "Consistent service and delivery speed across repeat orders. Communication remains prompt each time.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Eric Powell",
    "rating": 5,
    "body": "Ordering is simple and fulfillment is fast. Support has been easy to work with.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Elias Chavez",
    "rating": 5,
    "body": "Great customer service, quick shipping, and consistent order quality controls.",
    "date": "Thu, Feb 12 2026 PST"
  }
]

/** Aggregate rating shown in the section header (keep in sync with Trustpilot). */
export const AGGREGATE_RATING = 4.7;
export const TOTAL_REVIEW_COUNT:number = reviews.length;
