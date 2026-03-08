import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#030105" },
    { media: "(prefers-color-scheme: light)", color: "#fbf8ff" },
  ],
  colorScheme: "dark light",
};

