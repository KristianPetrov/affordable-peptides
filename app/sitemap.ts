import type { MetadataRoute } from "next";

import { peptideProducts } from "@/lib/products";
import { absoluteUrl, marketingRoutes, siteMetadata } from "@/lib/seo";

export default function sitemap (): MetadataRoute.Sitemap
{
  const now = new Date();
  const ogImage = absoluteUrl(siteMetadata.socialImagePath);

  const staticEntries: MetadataRoute.Sitemap = marketingRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
    // Include Open Graph image for main pages to help with search thumbnails
    images: route.path === "/" || route.path === "/store" ? [ogImage] : undefined,
  }));

  const productEntries: MetadataRoute.Sitemap = peptideProducts.map((product) =>
  {
    const variantWithImage = product.variants.find(
      (variant) => typeof variant.mockupLabel === "string",
    );
    const imagePath = variantWithImage?.mockupLabel;
    return {
      url: absoluteUrl(`/store/product/${product.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
      images: imagePath ? [absoluteUrl(imagePath)] : undefined,
    };
  });

  return [...staticEntries, ...productEntries];
}

