import type { Metadata } from "next";

import NavBar from "@/components/NavBar";
import StoreClient from "@/components/store/StoreClient";
import { getProductsWithInventory } from "@/lib/products.server";
import { siteMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const storeTitle = "Research Peptide Storefront";
const storeDescription =
  "Browse transparent, lab-tested peptides, blends, and research injectables with live inventory and wholesale tiers.";

export const metadata: Metadata = {
  title: storeTitle,
  description: storeDescription,
  keywords: [
    "peptide store",
    "research peptides catalog",
    "lab-tested peptides",
    "bulk peptide pricing",
  ],
  alternates: {
    canonical: "/store",
  },
  openGraph: {
    title: `${storeTitle} | ${siteMetadata.name}`,
    description: storeDescription,
    url: "/store",
    type: "website",
    images: [
      {
        url: siteMetadata.socialImagePath,
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
    images: [siteMetadata.socialImagePath],
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
