import NavBar from "@/components/NavBar";
import ProductMockup from "@/components/ProductMockup";
import {
  peptideProducts,
  productCategories,
  type Product,
  type Variant,
} from "@/lib/products";

const CATEGORY_LOOKUP = new Map(
  productCategories.map((category) => [category.id, category.label])
);

type ProductWithMockups = {
  product: Product;
  variants: Variant[];
};

const productsWithMockups: ProductWithMockups[] = peptideProducts
  .map((product) => ({
    product,
    variants: product.variants.filter(
      (variant) => typeof variant.mockupLabel === "string"
    ),
  }))
  .filter((entry) => entry.variants.length > 0);

export default function MockupsPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-12 lg:px-16">
        <div className="space-y-4 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-purple-200">
            Product Mockups
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Bottle renders paired with buying options
          </h1>
          <p className="text-balance text-sm text-zinc-400 sm:text-base">
            Every mockup below is linked directly to its product/variant entry,
            so you can review the label art, dosage, and tiered research pricing
            in one place.
          </p>
        </div>

        {productsWithMockups.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-purple-900/50 bg-black/60 p-12 text-center text-sm text-zinc-400">
            No variants are currently mapped to label assets. Add PNGs to{" "}
            <code>/public/products</code> and set the <code>mockupLabel</code>{" "}
            property on each variant in <code>lib/products.ts</code>.
          </div>
        ) : (
          <div className="mt-12 space-y-12">
            {productsWithMockups.map(({ product, variants }) => (
              <section
                key={product.slug}
                className="rounded-3xl border border-purple-900/60 bg-gradient-to-b from-[#150022]/70 via-[#090012] to-black/90 p-6 sm:p-8"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {product.categories.map((categoryId) => {
                        const label = CATEGORY_LOOKUP.get(categoryId);
                        if (!label) {
                          return null;
                        }
                        return (
                          <span
                            key={`${product.slug}-${categoryId}`}
                            className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-purple-200"
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    <h2 className="text-2xl font-semibold text-white">
                      {product.name}
                    </h2>
                    <p className="text-sm text-zinc-400">
                      {product.researchFocus}
                    </p>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {variants.map((variant) => (
                      <article
                        key={`${product.slug}-${variant.label}-mockup`}
                        className="flex flex-col gap-5 rounded-3xl border border-purple-900/50 bg-black/60 p-5"
                      >
                        <ProductMockup
                          labelSrc={variant.mockupLabel!}
                          productName={`${product.name} ${variant.label}`}
                          size="lg"
                        />
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-200">
                              {variant.label}
                            </p>
                            <p className="text-xs text-zinc-400">
                              Standard 1 / 5 / 10 unit research tiers
                            </p>
                          </div>
                          <ul className="grid grid-cols-3 gap-3">
                            {variant.tiers.map((tier) => (
                              <li
                                key={`${variant.label}-${tier.quantity}`}
                                className="rounded-2xl border border-purple-900/40 bg-gradient-to-b from-[#1b0b2b] to-[#090010] p-3 text-center text-xs text-purple-100"
                              >
                                <span className="block text-[0.65rem] uppercase tracking-[0.35em] text-purple-300">
                                  Qty {tier.quantity}
                                </span>
                                <span className="mt-1 block text-sm font-semibold text-white">
                                  {tier.price}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


