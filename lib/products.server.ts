import "server-only";

import {
  getInventoryKey,
  getProductBySlug,
  peptideProducts,
  type Product,
} from "./products";
import { getAllProductInventory } from "./db";

function cloneProductWithInventory(
  product: Product,
  inventoryMap: Map<string, number>
): Product {
  return {
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      stockQuantity: Math.max(
        inventoryMap.get(getInventoryKey(product.slug, variant.label)) ?? 0,
        0
      ),
    })),
  };
}

export async function getProductsWithInventory(): Promise<Product[]> {
  const inventory = await getAllProductInventory();
  const inventoryMap = new Map<string, number>();
  for (const record of inventory) {
    inventoryMap.set(getInventoryKey(record.productSlug, record.variantLabel), record.stock);
  }

  return peptideProducts.map((product) =>
    cloneProductWithInventory(product, inventoryMap)
  );
}

export async function getProductBySlugWithInventory(
  slug: string
): Promise<Product | null> {
  const product = getProductBySlug(slug);
  if (!product) {
    return null;
  }

  const inventory = await getAllProductInventory();
  const inventoryMap = new Map<string, number>();
  for (const record of inventory) {
    inventoryMap.set(getInventoryKey(record.productSlug, record.variantLabel), record.stock);
  }

  return cloneProductWithInventory(product, inventoryMap);
}

export { getProductSlugByName } from "./products";

