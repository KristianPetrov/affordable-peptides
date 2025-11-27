import NavBar from "@/components/NavBar";
import StoreClient from "@/components/store/StoreClient";
import { getProductsWithInventory } from "@/lib/products.server";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const products = await getProductsWithInventory();

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <StoreClient products={products} />
    </div>
  );
}
