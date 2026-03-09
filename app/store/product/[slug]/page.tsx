import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Link from "next/link";
import { NavBar, ProductDetailStandalone } from "@ap/shared-ui";
import { getMoleculesForProduct } from "@ap/shared-core";
import {
  getProductBySlug,
  peptideProducts,
  productCategories,
  type Product,
} from "@/lib/products";
import {
  LABORATORY_USE_ONLY_NOTICE,
  WEBSITE_RESEARCH_DISCLAIMER,
  getCompliantDetailedDescription,
  getCompliantProduct,
} from "@/lib/compliance";
import { getProductBySlugWithInventory } from "@/lib/products.server";
import {
  FALLBACK_PRODUCT_IMAGE,
  absoluteUrl,
  createProductJsonLd,
  serializeJsonLd,
  siteMetadata,
} from "@/lib/seo";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

const categoryLookup = new Map(
  productCategories.map((category) => [category.id, category.label]),
);

const getProductImagePath = (product: Product): string => {
  const variantWithImage = product.variants.find(
    (variant) => typeof variant.mockupLabel === "string",
  );
  return variantWithImage?.mockupLabel ?? FALLBACK_PRODUCT_IMAGE;
};

const getProductKeywords = (product: Product): string[] => {
  const categoryNames = product.categories
    .map((categoryId) => categoryLookup.get(categoryId) ?? categoryId)
    .filter(Boolean);

  const baseKeywords = [
    product.name,
    `${product.name} research material`,
    ...categoryNames,
    "laboratory research material",
    "certificate of analysis",
    "research-use-only",
  ];

  return Array.from(
    new Set(
      baseKeywords
        .map((keyword) => keyword?.toString().trim())
        .filter((keyword): keyword is string => Boolean(keyword)),
    ),
  );
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugWithInventory(slug);
  if (!product) {
    notFound();
  }

  const molecules = getMoleculesForProduct(product.name);
  const productUrl = absoluteUrl(`/store/product/${product.slug}`);
  const imagePath = getProductImagePath(product);
  const productJsonLd = createProductJsonLd({
    product,
    productUrl,
    imageUrl: absoluteUrl(imagePath),
    keywords: getProductKeywords(product),
  });

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
      <script
        type="application/ld+json"
        defer
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
    </div>
  );
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

  const compliantProduct = getCompliantProduct(product);
  const description =
    getCompliantDetailedDescription(compliantProduct) ||
    "Review laboratory research materials and analytical documentation.";

  const title = `${product.name} | ${siteMetadata.name} Store`;
  const imagePath = getProductImagePath(product);
  const imageUrl = absoluteUrl(imagePath);
  const keywords = getProductKeywords(product);
  const canonicalPath = `/store/product/${product.slug}`;
  const categoryLabel =
    categoryLookup.get(product.categories[0]) ?? "Research Material";
  const canonicalTestUrl =
    product.testResultUrl ||
    product.variants.find((variant) => variant.testResultUrl)?.testResultUrl;

  return {
    title,
    description,
    keywords,
    category: categoryLabel,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} laboratory research material`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    other: canonicalTestUrl
      ? {
          "research-use-notice": `${WEBSITE_RESEARCH_DISCLAIMER} ${LABORATORY_USE_ONLY_NOTICE}`,
          "lab-test-report": canonicalTestUrl,
        }
      : {
          "research-use-notice": `${WEBSITE_RESEARCH_DISCLAIMER} ${LABORATORY_USE_ONLY_NOTICE}`,
        },
  };
}

export async function generateStaticParams() {
  return peptideProducts.map((product) => ({
    slug: product.slug,
  }));
}

