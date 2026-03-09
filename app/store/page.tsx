import type { Metadata } from "next";

import { NavBar, StoreClient } from "@ap/shared-ui";
import { getProductsWithInventory } from "@/lib/products.server";
import { absoluteUrl, siteMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const storeTitle = "Research Materials Catalog";
const storeDescription =
  "Browse laboratory research materials, package options, analytical certificates, and current catalog availability.";
const storeCanonicalUrl = absoluteUrl("/store");
const storeSocialImage = absoluteUrl(siteMetadata.socialImagePath);

export const metadata: Metadata = {
  title: storeTitle,
  description: storeDescription,
  keywords: [
    "research materials catalog",
    "laboratory peptide catalog",
    "certificate of analysis",
    "package options",
  ],
  alternates: {
    canonical: storeCanonicalUrl,
  },
  openGraph: {
    title: `${storeTitle} | ${siteMetadata.name}`,
    description: storeDescription,
    url: storeCanonicalUrl,
    type: "website",
    images: [
      {
        url: storeSocialImage,
        width: 1200,
        height: 630,
        alt: `${siteMetadata.name} storefront`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: storeTitle,
    description: storeDescription,
    images: [storeSocialImage],
  },
};

export default async function StorePage() {
  const products = await getProductsWithInventory();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <StoreClient products={products} />
    </div>
  );
}
