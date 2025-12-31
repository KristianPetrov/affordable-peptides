import { notFound, permanentRedirect } from "next/navigation";

import { getProductBySlug } from "@/lib/products";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyProductPage({ params }: PageProps) {
  const { slug } = await params;

  // Only redirect if this is a real product slug; otherwise keep a true 404.
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  permanentRedirect(`/store/product/${product.slug}`);
}












