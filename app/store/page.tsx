import NavBar from "@/components/NavBar";
import StoreClient from "@/components/store/StoreClient";
import { peptideProducts } from "@/lib/products";

export default function StorePage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <StoreClient products={peptideProducts} />
    </div>
  );
}
