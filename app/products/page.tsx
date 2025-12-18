import { permanentRedirect } from "next/navigation";

export default function LegacyProductsIndexPage() {
  permanentRedirect("/store");
}

