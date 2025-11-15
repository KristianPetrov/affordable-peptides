export type Tier = {
  quantity: string;
  price: string;
};

export type Variant = {
  label: string;
  tiers: Tier[];
};

export type ProductCategoryId =
  | "weight-metabolic"
  | "recovery-performance"
  | "hormone-growth"
  | "longevity-wellness"
  | "support-essentials";

export type ProductCategory = {
  id: ProductCategoryId;
  label: string;
  description: string;
};

export type Product = {
  name: string;
  slug: string;
  variants: Variant[];
  researchFocus: string;
  categories: ProductCategoryId[];
  isFeatured?: boolean;
};

export const productCategories: ProductCategory[] = [
  {
    id: "weight-metabolic",
    label: "Weight & Metabolic",
    description: "Peptides that influence appetite, insulin sensitivity, or fat metabolism.",
  },
  {
    id: "recovery-performance",
    label: "Recovery & Performance",
    description: "Supports soft-tissue repair, joint resiliency, and athletic output.",
  },
  {
    id: "hormone-growth",
    label: "Hormone & Growth",
    description: "Modulates growth hormone, IGF-1, and endocrine balance.",
  },
  {
    id: "longevity-wellness",
    label: "Longevity & Wellness",
    description: "Targets healthy aging, skin rejuvenation, immunity, and cellular energy.",
  },
  {
    id: "support-essentials",
    label: "Lab Essentials",
    description: "Sterile supplies and injectables that support compounding workflows.",
  },
];

const formatPrice = (value: number): string =>
{
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `$${formatted}`;
};

const createStandardTiers = (singlePrice: number): Tier[] => [
  { quantity: "1", price: formatPrice(singlePrice) },
  { quantity: "5", price: formatPrice(singlePrice * 4) },
  { quantity: "10", price: formatPrice(singlePrice * 7) },
];

const createVariant = (label: string, singlePrice: number): Variant => ({
  label,
  tiers: createStandardTiers(singlePrice),
});

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type ProductDefinition = Omit<Product, "slug"> & { slug?: string };

const defineProduct = (definition: ProductDefinition): Product => ({
  ...definition,
  slug: definition.slug ?? slugify(definition.name),
});

const productDefinitions: ProductDefinition[] = [
  {
    name: "AOD 9604",
    researchFocus: "Targets stubborn adipose tissue by mimicking the fat-metabolizing fragment of HGH.",
    categories: ["weight-metabolic"],
    isFeatured: true,
    variants: [
      createVariant("5mg", 50),
      createVariant("10mg", 80),
    ],
  },
  {
    name: "Bacteriostatic Water",
    researchFocus: "Sterile benzyl-alcohol solution for safe peptide reconstitution.",
    categories: ["support-essentials"],
    variants: [
      createVariant("3ml", 2),
      createVariant("10ml", 4),
    ],
  },
  {
    name: "BPC + TB Combo",
    researchFocus: "Pairs BPC-157 and TB-500 to fast-track connective tissue and tendon repair.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg each", 50),
      createVariant("10mg each", 80),
    ],
  },
  {
    name: "BPC-157",
    researchFocus: "Supports gut lining integrity along with tendon, muscle, and vascular healing.",
    categories: ["recovery-performance", "longevity-wellness"],
    isFeatured: true,
    variants: [
      createVariant("5mg", 40),
      createVariant("10mg", 70),
    ],
  },
  {
    name: "CJC-1295",
    researchFocus: "Long-acting GHRH analog that sustains GH and IGF-1 release for lean mass.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("No DAC + IPA (10mg)", 70),
      createVariant("With DAC (5mg)", 50),
      createVariant("Without DAC (5mg)", 40),
      createVariant("Without DAC (10mg)", 70),
    ],
  },
  {
    name: "Epithalon",
    researchFocus: "Telomerase-supportive peptide studied for circadian and longevity benefits.",
    categories: ["longevity-wellness"],
    variants: [
      createVariant("10mg", 30),
      createVariant("50mg", 80),
    ],
  },
  {
    name: "GHK-CU",
    researchFocus: "Copper tripeptide that promotes collagen synthesis, skin quality, and wound care.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("50mg", 40),
      createVariant("100mg", 70),
    ],
  },
  {
    name: "GLOW",
    researchFocus: "BPC/TB/GHK blend tailored for regenerative aesthetics and total-body recovery.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("70mg", 90),
    ],
  },
  {
    name: "GLP-1",
    researchFocus: "Incretin mimetic that improves satiety, glucose control, and weight reduction.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("5mg", 40),
    ],
  },
  {
    name: "Glutathione",
    researchFocus: "Master antioxidant that bolsters detoxification and redox balance.",
    categories: ["longevity-wellness"],
    variants: [
      createVariant("1500mg", 50),
    ],
  },
  {
    name: "HCG",
    researchFocus: "Gonadotropin that helps preserve endogenous testosterone during protocols.",
    categories: ["hormone-growth", "support-essentials"],
    variants: [
      createVariant("10,000 IU", 60),
    ],
  },
  {
    name: "HGH",
    researchFocus: "Recombinant human growth hormone for profound anabolic and lipolytic studies.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("100 IU kit", 200),
      createVariant("150 IU kit", 250),
    ],
  },
  {
    name: "IGF-1 LR3",
    researchFocus: "Extended IGF signaling that supports muscle hyperplasia investigations.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("1mg", 70),
    ],
  },
  {
    name: "Ipamorelin",
    researchFocus: "Selective GHRP with minimal cortisol impact for pulsatile GH release.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("5mg", 30),
      createVariant("10mg", 50),
    ],
  },
  {
    name: "KLOW",
    researchFocus: "GHK/KPV/BPC/TB blend that targets skin glow, inflammation control, and joint comfort.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("80mg", 100),
    ],
  },
  {
    name: "KPV",
    researchFocus: "Anti-inflammatory tripeptide studied for gut lining support and immune calm.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg", 40),
      createVariant("10mg", 70),
    ],
  },
  {
    name: "L-Carnitine",
    researchFocus: "Transports fatty acids into mitochondria to elevate beta-oxidation.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10ml (600mg/ml)", 60),
    ],
  },
  {
    name: "Lipo-C",
    researchFocus: "MIC + B12 blend that mobilizes liver fat and supports methylation.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10ml", 60),
    ],
  },
  {
    name: "Lipo-C (No B12)",
    researchFocus: "MIC-only formula for clients who avoid methyl donors or B vitamins.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10ml", 60),
    ],
  },
  {
    name: "MOTS-C",
    researchFocus: "Mitochondrial peptide improving insulin sensitivity and performance endurance.",
    categories: ["weight-metabolic", "longevity-wellness"],
    variants: [
      createVariant("10mg", 40),
      createVariant("40mg", 100),
    ],
  },
  {
    name: "NAD+",
    researchFocus: "Coenzyme precursor that sustains cellular energy and sirtuin activity.",
    categories: ["longevity-wellness", "weight-metabolic"],
    variants: [
      createVariant("500mg", 60),
      createVariant("1000mg", 100),
    ],
  },
  {
    name: "Retatrutide",
    researchFocus: "Triple agonist driving exceptional weight and glycemic control.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10mg", 100),
      createVariant("20mg", 160),
      createVariant("30mg", 200),
    ],
  },
  {
    name: "SLU-PP-332",
    researchFocus: "PPARδ modulator explored for muscular endurance and fat oxidation.",
    categories: ["weight-metabolic", "recovery-performance"],
    variants: [
      createVariant("5mg", 80),
    ],
  },
  {
    name: "TB-500",
    researchFocus: "Synthetic thymosin β4 fragment that accelerates angiogenesis and joint recovery.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg", 40),
      createVariant("10mg", 70),
    ],
  },
  {
    name: "Tesamorelin",
    researchFocus: "FDA-backed GHRH analog proven to reduce visceral adipose tissue.",
    categories: ["hormone-growth", "weight-metabolic"],
    variants: [
      createVariant("10mg", 60),
      createVariant("20mg", 100),
    ],
  },
  {
    name: "Tirzepatide",
    researchFocus: "Dual GIP/GLP-1 agonist for aggressive weight and cardiometabolic management.",
    categories: ["weight-metabolic"],
    isFeatured: true,
    variants: [
      createVariant("10mg", 80),
      createVariant("20mg", 140),
      createVariant("30mg", 180),
    ],
  },
];

export const peptideProducts: Product[] = productDefinitions.map(defineProduct);

const productBySlug = new Map<string, Product>();
peptideProducts.forEach((product) =>
{
  productBySlug.set(product.slug, product);
});

export const featuredProducts = peptideProducts.filter(
  (product) => product.isFeatured
);

export const getProductBySlug = (slug: string): Product | undefined =>
  productBySlug.get(slug);
