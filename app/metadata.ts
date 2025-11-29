import type { Metadata } from "next";

const siteUrl = "https://affordablepeptides.life";
const socialImage = "/opengraph-image";
const title =
  "Affordable Peptides | Research-Grade Peptides Without the Markup";
const description =
  "Affordable Peptides delivers high-purity, research-grade peptides backed by transparent testing, fair pricing, and science-first integrity.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Affordable Peptides",
  title: {
    default: title,
    template: "%s | Affordable Peptides",
  },
  description,
  abstract:
    "Research-grade peptides, transparent testing, and wholesale pricing for serious investigators.",
  keywords: [
    "peptides",
    "research-grade peptides",
    "third-party tested peptides",
    "affordable peptides",
    "peptide research supplies",
    "peptide transparency",
    "lab verified peptides",
    "tirzepatide",
    "retatrutide",
    "GLP-1",
  ],
  creator: "Set Free Digital Disciples",
  publisher: "Affordable Peptides",
  authors: [
    { name: "Affordable Peptides", url: siteUrl },
    {
      name: "Set Free Digital Disciples",
      url: "https://www.setfreedigitaldisciples.com",
    },
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": siteUrl,
    },
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Affordable Peptides",
    images: [
      {
        url: socialImage,
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
    images: [socialImage],
  },
  appLinks: {
    web: {
      url: siteUrl,
      should_fallback: true,
    },
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
    shortcut: ["/favicon.png"],
    apple: ["/favicon.png"],
  },
  other: {
    "designed-by":
      "This website was designed by Set Free Digital Disciples – https://www.setfreedigitaldisciples.com",
  },
};

