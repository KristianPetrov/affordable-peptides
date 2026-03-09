import type { Product, ProductCategoryId } from "./products";
import {
  LABORATORY_USE_ONLY_NOTICE,
  PRODUCT_RESEARCH_DISCLAIMER,
  WEBSITE_RESEARCH_DISCLAIMER,
} from "@ap/shared-core";

const CATEGORY_CONTEXT: Record<ProductCategoryId, string> = {
  "weight-metabolic": "metabolic pathway and receptor-signaling studies",
  "recovery-performance": "peptide signaling and tissue-response studies",
  "hormone-growth": "endocrine and receptor-signaling studies",
  "longevity-wellness": "cellular maintenance and aging-pathway studies",
  "support-essentials": "laboratory preparation and handling workflows",
};

function formatList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? "laboratory research";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getCategoryContext(product: Product): string {
  const contexts = Array.from(
    new Set(product.categories.map((categoryId) => CATEGORY_CONTEXT[categoryId]))
  ).filter(Boolean);

  return formatList(contexts);
}

function getVariantSummary(product: Product): string {
  const labels = Array.from(
    new Set(product.variants.map((variant) => variant.label.trim()).filter(Boolean))
  );

  if (labels.length === 0) {
    return "Catalog package details are available on request.";
  }

  if (labels.length === 1) {
    return `Catalog package available: ${labels[0]}.`;
  }

  return `Catalog packages include ${formatList(labels)}.`;
}

export function getCompliantResearchFocus(product: Product): string {
  return `${product.name} is supplied as a laboratory research material for ${getCategoryContext(product)}. ${getVariantSummary(product)}`;
}

export function getCompliantDetailedDescription(product: Product): string {
  return `${product.name} is offered for laboratory, academic, and institutional research involving ${getCategoryContext(product)}. Product documentation may include package identifiers, analytical certificate references, and handling information where available.`;
}

export function getCompliantProduct(product: Product): Product {
  return {
    ...product,
    researchFocus: getCompliantResearchFocus(product),
    detailedDescription: getCompliantDetailedDescription(product),
  };
}

export {
  LABORATORY_USE_ONLY_NOTICE,
  PRODUCT_RESEARCH_DISCLAIMER,
  WEBSITE_RESEARCH_DISCLAIMER,
};
