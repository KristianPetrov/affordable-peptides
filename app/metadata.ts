import type { Metadata } from "next";

import { absoluteUrl, siteMetadata } from "@/lib/seo";

const defaultTitle = `${siteMetadata.name} | Research-Grade Peptides Without the Markup`;
const socialImage = absoluteUrl(siteMetadata.socialImagePath);
const logoImage = absoluteUrl(siteMetadata.logoPath);

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  applicationName: siteMetadata.name,
  title: {
    default: defaultTitle,
    template: "%s | Affordable Peptides",
  },
  description: siteMetadata.description,
  abstract:
    "Research-grade peptides, transparent testing, and wholesale pricing for serious investigators.",
  keywords: [...siteMetadata.keywords],
  creator: "Set Free Digital Disciples",
  publisher: siteMetadata.name,
  authors: [
    { name: siteMetadata.name, url: siteMetadata.url },
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
    canonical: siteMetadata.url,
    languages: {
      "en-US": siteMetadata.url,
    },
  },
  openGraph: {
    title: defaultTitle,
    description: siteMetadata.description,
    type: "website",
    locale: siteMetadata.localeOg,
    url: siteMetadata.url,
    siteName: siteMetadata.name,
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
    title: defaultTitle,
    description: siteMetadata.description,
    images: [socialImage],
  },
  appLinks: {
    web: {
      url: siteMetadata.url,
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
  assets: [siteMetadata.url],
  bookmarks: [siteMetadata.url],
  icons: {
    icon: [{ url: "/favicon.png" }],
    shortcut: ["/favicon.png"],
    apple: ["/favicon.png"],
  },
  other: {
    "designed-by":
      "This website was designed by Set Free Digital Disciples – https://www.setfreedigitaldisciples.com",
    "og:logo": logoImage,
  },
};

