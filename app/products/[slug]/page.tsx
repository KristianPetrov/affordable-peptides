import { notFound, permanentRedirect } from "next/navigation";

import { getProductBySlug } from "@/lib/products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyProductsProductPage({ params }: PageProps) {
  const { slug } = await params;

  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  permanentRedirect(`/store/product/${product.slug}`);
}






