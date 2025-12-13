import type { MetadataRoute } from "next";

import { absoluteUrl, siteMetadata } from "@/lib/seo";

export default function manifest (): MetadataRoute.Manifest
{
  return {
    name: siteMetadata.name,
    short_name: "Affordable Peptides",
    description: siteMetadata.description,
    start_url: "/",
    display: "standalone",
    background_color: "#030105",
    theme_color: "#030105",
    orientation: "portrait-primary",
    icons: [
      {
        src: absoluteUrl("/favicon.png"),
        sizes: "762x835",
        type: "image/png",
        purpose: "any",
      },
      {
        src: absoluteUrl("/favicon.png"),
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["research", "health", "science"],
    lang: siteMetadata.locale,
    dir: "ltr",
    scope: "/",
    related_applications: [],
    prefer_related_applications: false,
  };
}
