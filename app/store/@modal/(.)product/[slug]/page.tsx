import { notFound } from "next/navigation";

import ProductModal from "@/components/store/ProductModal";
import { getMoleculesForProduct } from "@/lib/molecules";
import { peptideProducts } from "@/lib/products";
import { getProductBySlugWithInventory } from "@/lib/products.server";

type ProductModalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductModalPage({
  params,
}: ProductModalPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugWithInventory(slug);
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

