import { notFound } from "next/navigation";

import { ProductModal } from "@/components";
import { getMoleculesForProduct } from "@/lib/core";
import { peptideProducts } from "@/lib/products";
import { getProductBySlugWithInventory } from "@/lib/products.server";

type ProductModalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductModalPage ({
  params,
}: ProductModalPageProps)
{
  const { slug } = await params;
  const product = await getProductBySlugWithInventory(slug);
  if (!product) {
    notFound();
  }

  const molecules = getMoleculesForProduct(product.name);

  return <ProductModal product={product} molecules={molecules} />;
}

export async function generateStaticParams ()
{
  return peptideProducts.map((product) => ({
    slug: product.slug,
  }));
}

