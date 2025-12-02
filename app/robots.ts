import type { MetadataRoute } from "next";

import { robotsDisallowPaths, siteMetadata } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: Array.from(robotsDisallowPaths),
      },
    ],
    sitemap: `${siteMetadata.url}/sitemap.xml`,
    host: siteMetadata.url,
  };
}

