import type { Metadata } from "next";

const title =
  "Affordable Peptides | Research-Grade Peptides Without the Markup";
const description =
  "Affordable Peptides delivers high-purity, research-grade peptides backed by transparent testing, fair pricing, and science-first integrity.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | Affordable Peptides",
  },
  description,
  keywords: [
    "peptides",
    "research-grade peptides",
    "third-party tested peptides",
    "affordable peptides",
    "peptide research supplies",
    "peptide transparency",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_US",
    url: "https://affordablepeptides.life",
    siteName: "Affordable Peptides",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Affordable Peptides hero graphic",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "research",
  icons: {
    icon: [{ url: "/favicon.png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  authors: [{ name: "Affordable Peptides" }],
};

