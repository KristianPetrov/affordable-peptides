import type { CartItem } from "@/components/store/StorefrontContext";
import { getAllProductInventory, setProductStock } from "@/lib/db";
import { getInventoryKey, getProductSlugByName } from "@/lib/products";

export type InventoryMap = Map<string, number>;

export type StockAdjustment = {
  productSlug: string;
  variantLabel: string;
  nextStock: number;
};

export async function loadInventoryMap(): Promise<InventoryMap> {
  const inventory = await getAllProductInventory();
  const map: InventoryMap = new Map();

  for (const record of inventory) {
    map.set(getInventoryKey(record.productSlug, record.variantLabel), record.stock);
  }

  return map;
}

function resolveProductSlug(item: CartItem): string | null {
  if (item.productSlug) {
    return item.productSlug;
  }

  const slug = getProductSlugByName(item.productName);
  if (slug) {
    item.productSlug = slug;
    return slug;
  }

  return null;
}

function getRequestedUnits(item: CartItem): number {
  return item.tierQuantity * Math.max(item.count ?? 1, 1);
}

function applyAdjustment(
  item: CartItem,
  inventoryMap: InventoryMap,
  mode: "reserve" | "restock"
): { success: true; adjustment: StockAdjustment } | { success: false; error: string } {
  const productSlug = resolveProductSlug(item);
  if (!productSlug) {
    return {
      success: false,
      error: `Unable to locate inventory for ${item.productName}. Refresh the page and try again.`,
    };
  }

  const inventoryKey = getInventoryKey(productSlug, item.variantLabel);
  const available = inventoryMap.get(inventoryKey) ?? 0;
  const units = getRequestedUnits(item);

  const delta = mode === "reserve" ? -units : units;
  const nextStock = available + delta;

  if (mode === "reserve" && nextStock < 0) {
    const remaining = available;
    return {
      success: false,
      error:
        remaining > 0
          ? `Only ${remaining} unit${remaining === 1 ? "" : "s"} of ${
              item.productName
            } (${item.variantLabel}) remain. Adjust your cart before submitting.`
          : `${item.productName} (${item.variantLabel}) is out of stock.`,
    };
  }

  inventoryMap.set(inventoryKey, nextStock);

  return {
    success: true,
    adjustment: {
      productSlug,
      variantLabel: item.variantLabel,
      nextStock,
    },
  };
}

export function prepareInventoryAdjustments(
  items: CartItem[],
  inventoryMap: InventoryMap,
  mode: "reserve" | "restock"
): { success: true; adjustments: StockAdjustment[] } | { success: false; error: string } {
  const adjustments: StockAdjustment[] = [];

  for (const item of items) {
    const result = applyAdjustment(item, inventoryMap, mode);
    if (!result.success) {
      return result;
    }
    adjustments.push(result.adjustment);
  }

  return { success: true, adjustments };
}

export async function applyInventoryAdjustments(adjustments: StockAdjustment[]) {
  if (adjustments.length === 0) {
    return;
  }

  await Promise.all(
    adjustments.map(({ productSlug, variantLabel, nextStock }) =>
      setProductStock(productSlug, variantLabel, nextStock)
    )
  );
}

