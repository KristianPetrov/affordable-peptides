import type { MetadataRoute } from "next";

import { peptideProducts } from "@/lib/products";
import { absoluteUrl, marketingRoutes } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = marketingRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
  }));

  const productEntries: MetadataRoute.Sitemap = peptideProducts.map((product) => {
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

