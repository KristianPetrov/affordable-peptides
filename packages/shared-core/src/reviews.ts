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
    "body": "Great prices and top-tier products. Was hesitant about payment at first, but Vincent explained everything and even included a complimentary bottle. Ordered 3 times since—fast delivery every time. 100/10 recommend.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Chris Lewis",
    "rating": 5,
    "body": "Used Affordable Peptides (Retatrutide) for 4 months and went from 193 to 166. Feel great and happy with progress. Excellent service and organized records. Highly recommend.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Sue",
    "rating": 5,
    "body": "Great product and wonderful service. Well trusted.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Isabelle T",
    "rating": 5,
    "body": "Vincent is fast, professional, and super reliable. Easy to interact with, very knowledgeable, and provides fantastic customer service. Highly recommend.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "leslie",
    "rating": 5,
    "body": "Amazing experience—thanks to Vince and Susan for great advice and communication. Always available for questions. Fast shipping and super convenient. My #1 peptide dealer.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Renato Gonzalez",
    "rating": 5,
    "body": "Great peptides and great service—Affordable Peptides has changed my life. They ship immediately after you order.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Sal Montes",
    "rating": 5,
    "body": "Great customer service and fast shipping. I’ve referred many people and everyone has had a great experience.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Michaeldestinyaol.com",
    "rating": 5,
    "body": "Working with Vincent was a pleasure. He listened, made helpful suggestions, and went above and beyond.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Ricky Burnell",
    "rating": 5,
    "body": "Order arrived quickly and securely packaged. A+ quality—clean, well-labeled, and professionally handled. Will order again and recommend to others.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Jesus Perez",
    "rating": 5,
    "body": "Vincent is extremely trustworthy, responsive, and very knowledgeable. He explains everything clearly and never rushes you. Fast handling and consistent communication. Highly recommend.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Mersha Tamrat",
    "rating": 5,
    "body": "I was hesitant at first due to payment options (Zelle/Venmo/Cash App), but everything went smoothly. Great quality, reliable shipping, and Vincent’s direct support is amazing. Definitely recommend.",
    "date": "Fri, Feb 13 2026 PST"
  },
  {
    "name": "Zoe K",
    "rating": 5,
    "body": "Love this stuff—makes me feel good and I love the way it’s making me look and feel!",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Chrissy Garavaglia",
    "rating": 5,
    "body": "Love how quickly orders arrive and the results have been fast. Highly recommend for peptide needs.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Brenden Mccarthy",
    "rating": 5,
    "body": "Product works—down 35 pounds. Great customer service, very knowledgeable, and takes time to explain things. Reliable, great quality, and excellent support.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Christopher Connole",
    "rating": 5,
    "body": "Third peptide company I’ve tried, first where I’ve seen verified quality and real results. They test their products and quality is not “cheap.” Used 6 compounds over 5 months—excellent results and service.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Angelene Victoria Tropp",
    "rating": 5,
    "body": "Great experience—fast delivery, consistent quality, and they always answer my questions. Recommend to family and friends all the time.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Alaya Burg",
    "rating": 5,
    "body": "Best peptides, best prices, best customer service!",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Brandyn S",
    "rating": 5,
    "body": "Great product, fast shipping, and great customer service.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Kristle Bierd",
    "rating": 5,
    "body": "Exceptional customer service—responsive and helpful. Super fast shipping, well-packaged order, and clearly labeled professional products. Highly recommend and will be a repeat customer.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Ashley Rosborough",
    "rating": 5,
    "body": "So grateful I found Affordable Peptides. Best product I’ve tried and customer service is far superior to other companies. Will recommend to friends and family.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Sean Shively",
    "rating": 5,
    "body": "Great quality, service, and price. Ordered three times—delivered every time and fast. Amazing customer service. Buying here from now on.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Eric Powell",
    "rating": 5,
    "body": "Easy ordering and fast service. Gets all my business—super easy to deal with.",
    "date": "Thu, Feb 12 2026 PST"
  },
  {
    "name": "Elias Chavez",
    "rating": 5,
    "body": "Amazing customer service, fast shipping, and great products!",
    "date": "Thu, Feb 12 2026 PST"
  }
]

/** Aggregate rating shown in the section header (keep in sync with Trustpilot). */
export const AGGREGATE_RATING = 4.7;
export const TOTAL_REVIEW_COUNT:number = reviews.length;
