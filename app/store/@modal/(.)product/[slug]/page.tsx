import { notFound } from "next/navigation";

import ProductModal from "@/components/store/ProductModal";
import { getMoleculesForProduct } from "@/lib/molecules";
import { getProductBySlug, peptideProducts } from "@/lib/products";

type ProductModalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductModalPage({
  params,
}: ProductModalPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const molecules = getMoleculesForProduct(product.name);

  return <ProductModal product={product} molecules={molecules} />;
}

export async function generateStaticParams() {
  return peptideProducts.map((product) => ({
    slug: product.slug,
  }));
}

