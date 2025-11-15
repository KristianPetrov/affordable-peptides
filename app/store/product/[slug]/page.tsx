import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import ProductDetailStandalone from "@/components/store/ProductDetailStandalone";
import { getMoleculesForProduct } from "@/lib/molecules";
import { getProductBySlug, peptideProducts } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const molecules = getMoleculesForProduct(product.name);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <div className="mx-auto mt-6 flex max-w-6xl justify-start px-6 sm:px-12 lg:px-16">
        <Link
          href="/store"
          className="inline-flex items-center justify-center rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-100 transition hover:border-purple-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Back to Store
        </Link>
      </div>
      <ProductDetailStandalone product={product} molecules={molecules} />
    </div>
  );
}

export async function generateStaticParams() {
  return peptideProducts.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return {
      title: "Product not found | Affordable Peptides",
    };
  }

  const description =
    product.researchFocus ||
    "Explore the latest research-grade peptides available for your lab.";

  const title = `${product.name} | Affordable Peptides Store`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/store/product/${product.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

