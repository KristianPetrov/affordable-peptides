import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    images: [
      {
        url: "/affordable-peptides-logo-transparent.png",
        width: 1200,
        height: 630,
        alt: "Affordable Peptides logo on a dark purple background",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/affordable-peptides-logo-transparent.png"],
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
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  authors: [{ name: "Affordable Peptides" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
