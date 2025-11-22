export type Tier = {
  quantity: string;
  price: string;
};

export type Variant = {
  label: string;
  tiers: Tier[];
  mockupLabel?: string;
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
  detailedDescription?: string;
  categories: ProductCategoryId[];
  isFeatured?: boolean;
  testResultUrl?: string;
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
  return `$${formatted}`;/////////////////////
};

const createStandardTiers = (singlePrice: number): Tier[] => [
  { quantity: "1", price: formatPrice(singlePrice) },
  { quantity: "5", price: formatPrice(singlePrice * 4) },
  { quantity: "10", price: formatPrice(singlePrice * 7) },
];

const createVariant = (
  label: string,
  singlePrice: number,
  mockupLabel?: string
): Variant => ({
  label,
  tiers: createStandardTiers(singlePrice),
  mockupLabel,
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
    detailedDescription: "AOD 9604 is a fragment of human growth hormone (HGH) researched for its role in supporting fat metabolism and targeting stubborn adipose tissue without the broader endocrine activity of full-length HGH. It's a go-to peptide in studies focused on body-composition and metabolic pathways.",
    categories: ["weight-metabolic"],
    isFeatured: true,
    variants: [
      createVariant("5mg", 50, "/products/label-aod9604-5mg-3ml.png"),
      createVariant("10mg", 80, "/products/label-aod9604-10mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29337_AFFORD2WY8BJ",
  },
  {
    name: "Bacteriostatic Water",
    researchFocus: "Sterile benzyl-alcohol solution for safe peptide reconstitution.",
    detailedDescription: "Bacteriostatic Water is a sterile water-for-injection with benzyl alcohol, used in research settings to safely reconstitute multi-dose vials. It helps maintain vial integrity over repeated draws when proper aseptic technique is followed.",
    categories: ["support-essentials"],
    variants: [
      createVariant("3ml", 2, "/products/label-bacteriostatic-water-3ml.png"),
      createVariant("10ml", 4, "/products/label-bacteriostatic-water-10ml.png"),
    ],
  },
  {
    name: "BPC + TB Combo",
    researchFocus: "Pairs BPC-157 and TB-500 to fast-track connective tissue and tendon repair.",
    detailedDescription: "This combo pairs BPC-157 and TB-500, two peptides widely explored for connective tissue, tendon, and muscle support in preclinical models. Researchers value the stack for its potential to accelerate tissue repair, angiogenesis, and overall recovery signaling.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg each", 50, "/products/label-bpc157-tb-500-10mg-3ml.png"),
      createVariant(
        "10mg each",
        80,
        "/products/label-bpc157-tb-500-20mg-3ml.png"
      ),
    ],
  },
  {
    name: "BPC-157",
    researchFocus: "Supports gut lining integrity along with tendon, muscle, and vascular healing.",
    detailedDescription: "BPC-157 is a gastric-derived peptide studied for its support of gut integrity and the recovery of tendons, ligaments, muscles, and vascular tissue. Preclinical research highlights its potential role in promoting healthy circulation, angiogenesis, and tissue resilience.",
    categories: ["recovery-performance", "longevity-wellness"],
    isFeatured: true,
    variants: [
      createVariant("5mg", 40, "/products/label-bpc157-5mg-3ml.png"),
      createVariant("10mg", 70, "/products/label-bpc157-10mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29115_AFFORDX493E7",
  },
  {
    name: "CJC-1295",
    researchFocus: "Long-acting GHRH analog that sustains GH and IGF-1 release for lean mass.",
    detailedDescription: "CJC-1295 is a long-acting GHRH analog investigated for its ability to enhance pulsatile growth hormone (GH) and IGF-1 release. It's frequently used in research on lean mass, recovery, and growth-hormone–related endocrine dynamics.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant(
        "No DAC + IPA (10mg)",
        70,
        "/products/label-cjc1295-wo-dac-ipamorelin-10mg-3ml.png"
      ),
      createVariant("With DAC (5mg)", 50, "/products/label-cjc-1295-dac-5mg-3ml.png"),
      createVariant("Without DAC (5mg)", 40, "/products/label-cjc-1295-wo-dac-5mg-3ml.png"),
      createVariant(
        "Without DAC (10mg)",
        70,
        "/products/label-cjc-1295-wo-dac-10mg-3ml.png"
      ),
    ],
  },
  {
    name: "Epithalon",
    researchFocus: "Telomerase-supportive peptide studied for circadian and longevity benefits.",
    detailedDescription: "Epithalon (Epitalon) is a synthetic peptide explored in aging research for its effects on telomerase activity, circadian rhythm, and oxidative stress. Studies have positioned it as a potential tool for longevity and cellular health investigations.",
    categories: ["longevity-wellness"],
    variants: [
      createVariant("10mg", 30, "/products/label-epithalon-10mg-3ml.png"),
      createVariant("50mg", 80, "/products/label-epithalon-50mg-3ml.png"),
    ],
  },
  {
    name: "GHK-CU",
    researchFocus: "Copper tripeptide that promotes collagen synthesis, skin quality, and wound care.",
    detailedDescription: "GHK-Cu is a copper tripeptide widely studied for its positive impact on collagen synthesis, skin quality, and wound care. It appears in both cosmetic and regenerative research for its role in supporting dermal remodeling and overall tissue repair.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("50mg", 40, "/products/label-ghk-cu-50mg-3ml.png"),
      createVariant("100mg", 70, "/products/label-ghk-cu-100mg-3ml.png"),
    ],
  },
  {
    name: "GLOW",
    researchFocus: "BPC/TB/GHK blend tailored for regenerative aesthetics and total-body recovery.",
    detailedDescription: "GLOW combines BPC-157, TB-500, and GHK-Cu to create a regenerative-focused blend for aesthetic and recovery research. It's designed for investigators interested in both connective tissue support and skin quality optimization within a single formula.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("70mg", 90, "/products/label-glow-70mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29438_AFFORD4N2GYT",
  },
  {
    name: "GLP-1",
    researchFocus: "Incretin mimetic that improves satiety, glucose control, and weight reduction.",
    detailedDescription: "GLP-1 receptor agonists are incretin-based peptides researched for their effects on satiety, glucose regulation, and body-weight reduction. These compounds are central to modern metabolic and cardiometabolic studies.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("5mg", 40, "/products/label-glp1-5mg-3ml.png"),
    ],
  },
  {
    name: "Glutathione",
    researchFocus: "Master antioxidant that bolsters detoxification and redox balance.",
    detailedDescription: "Glutathione is the body's master intracellular antioxidant, heavily studied for its role in detoxification and redox balance. Research often focuses on its impact on oxidative stress, immune function, and cellular resilience.",
    categories: ["longevity-wellness"],
    variants: [
      createVariant(
        "1500mg",
        50,
        "/products/label-glutathione-1500mg-10ml.png"
      ),
    ],
  },
  {
    name: "HCG",
    researchFocus: "Gonadotropin that helps preserve endogenous testosterone during protocols.",
    detailedDescription: "HCG (human chorionic gonadotropin) is a well-characterized gonadotropin researched for its role in supporting endogenous testosterone and preserving reproductive function. It's commonly used in studies involving hormonal balance and testicular function.",
    categories: ["hormone-growth", "support-essentials"],
    variants: [
      createVariant("10,000 IU", 60, "/products/label-hcg-10k-iu-3ml.png"),
    ],
  },
  {
    name: "HGH",
    researchFocus: "Recombinant human growth hormone for profound anabolic and lipolytic studies.",
    detailedDescription: "Recombinant human growth hormone (HGH) has a long research history in growth-hormone deficiency, body composition, and recovery. Studies have explored its effects on lean mass, fat distribution, and performance-related endpoints under controlled conditions.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("10 IU kit", 200, "/products/label-hgh-10iu-3ml.png"),
      createVariant("15 IU kit", 250, "/products/label-hgh-15iu-3ml.png"),
    ],
  },
  {
    name: "IGF-1 LR3",
    researchFocus: "Extended IGF signaling that supports muscle hyperplasia investigations.",
    detailedDescription: "IGF-1 LR3 is a long-acting analog of insulin-like growth factor 1 designed to extend receptor interaction time. It's used in research on muscle hyperplasia, tissue repair, and cellular growth pathways.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("1mg", 70, "/products/label-igf-1-lr3-1mg-3ml.png"),
    ],
  },
  {
    name: "Ipamorelin",
    researchFocus: "Selective GHRP with minimal cortisol impact for pulsatile GH release.",
    detailedDescription: "Ipamorelin is a selective growth hormone secretagogue (GHRP) studied for its ability to stimulate pulsatile GH release with minimal impact on cortisol and prolactin. It's frequently paired with GHRH analogs in research exploring physiologic GH patterns.",
    categories: ["hormone-growth", "recovery-performance"],
    variants: [
      createVariant("5mg", 30, "/products/label-ipamorelin-5mg-3ml.png"),
      createVariant("10mg", 50, "/products/label-ipamorelin-10mg-3ml.png"),
    ],
  },
  {
    name: "KLOW",
    researchFocus: "GHK/KPV/BPC/TB blend that targets skin glow, inflammation control, and joint comfort.",
    detailedDescription: "KLOW blends GHK-Cu, KPV, BPC-157, and TB-500 for multi-system regenerative research. It's designed for investigators seeking a single formula that touches skin quality, inflammatory balance, and joint or connective-tissue comfort.",
    categories: ["longevity-wellness", "recovery-performance"],
    variants: [
      createVariant("80mg", 100, "/products/label-klow-80mg-3ml.png"),
    ],
  },
  {
    name: "KPV",
    researchFocus: "Anti-inflammatory tripeptide studied for gut lining support and immune calm.",
    detailedDescription: "KPV is an anti-inflammatory tripeptide derived from the α-MSH sequence and studied for its effects on gut lining support and immune modulation. Research models highlight its potential to help calm excessive inflammatory responses in barrier tissues.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg", 40, "/products/label-kpv-5mg-3ml.png"),
      createVariant("10mg", 70, "/products/label-kpv-10mg-3ml.png"),
    ],
  },
  {
    name: "L-Carnitine",
    researchFocus: "Transports fatty acids into mitochondria to elevate beta-oxidation.",
    detailedDescription: "L-Carnitine is a classic metabolic cofactor that transports fatty acids into mitochondria for beta-oxidation. It remains a staple in performance and metabolism research for its role in energy production and exercise recovery.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant(
        "10ml (600mg/ml)",
        60,
        "/products/label-l-carnatine-600mg-10ml.png"
      ),
    ],
  },
  {
    name: "Lipo-C",
    researchFocus: "MIC + B12 blend that mobilizes liver fat and supports methylation.",
    detailedDescription: "Lipo-C combines methionine, inositol, choline (MIC), and vitamin B12, and is often used in research on liver fat metabolism and methylation support. It's a popular option in weight-management–oriented protocols in laboratory and clinical research settings.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10ml", 60, "/products/label-lipo-c-10ml.png"),
    ],
  },
  {
    name: "Lipo-C (No B12)",
    researchFocus: "MIC-only formula for clients who avoid methyl donors or B vitamins.",
    detailedDescription: "This Lipo-C variant provides methionine, inositol, and choline only, omitting B12 for researchers working with subjects who avoid methyl donors or B vitamins. It targets the same liver-fat and methylation pathways while allowing more protocol flexibility.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10ml", 60, "/products/label-lipo-c-10ml.png"),
    ],
  },
  {
    name: "MOTS-C",
    researchFocus: "Mitochondrial peptide improving insulin sensitivity and performance endurance.",
    detailedDescription: "MOTS-C is a mitochondrial-derived peptide gaining attention for its role in insulin sensitivity, metabolic flexibility, and endurance in preclinical models. It's widely viewed as an \"exercise-mimetic\" candidate in longevity and performance research.",
    categories: ["weight-metabolic", "longevity-wellness"],
    variants: [
      createVariant("10mg", 40, "/products/label-mots-c-10mg-3ml.png"),
      createVariant("40mg", 100, "/products/label-mots-c-40mg-3ml.png"),
    ],
  },
  {
    name: "NAD+",
    researchFocus: "Coenzyme precursor that sustains cellular energy and sirtuin activity.",
    detailedDescription: "NAD+ is a central coenzyme in energy production and DNA repair, with levels known to decline with age and metabolic stress. Research with NAD+ and its precursors (like NR and NMN) centers on cellular energy, sirtuin activation, and healthy aging pathways.",
    categories: ["longevity-wellness", "weight-metabolic"],
    variants: [
      createVariant("500mg", 60, "/products/label-nad-500mg-10ml.png"),
      createVariant("1000mg", 100, "/products/label-nad-1000mg-10ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29420_AFFORDFJF486",
  },
  {
    name: "Retatrutide",
    researchFocus: "Triple agonist driving exceptional weight and glycemic control.",
    detailedDescription: "Retatrutide is a next-generation triple agonist (GIP/GLP-1/glucagon) in development for obesity and metabolic research. Early trials have reported exceptional weight and glycemic outcomes, making it one of the most closely watched peptides in the metabolic space.",
    categories: ["weight-metabolic"],
    variants: [
      createVariant("10mg", 100, "/products/label-retatrutide-10mg-3ml.png"),
      createVariant("20mg", 160, "/products/label-retatrutide-20mg-3ml.png"),
      createVariant("30mg", 200, "/products/label-retatrutide-30mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29097_AFFORD16FRWY",
  },
  {
    name: "SLU-PP-332",
    researchFocus: "PPARδ modulator explored for muscular endurance and fat oxidation.",
    detailedDescription: "SLU-PP-332 is a PPAR/ERR-pathway modulator explored as a potential \"exercise mimetic.\" Animal studies suggest benefits for muscular endurance, fat oxidation, and cardiometabolic health, positioning it at the cutting edge of performance and longevity research.",
    categories: ["weight-metabolic", "recovery-performance"],
    variants: [
      createVariant("5mg", 80, "/products/label-slupp332-5mg-3ml.png"),
    ],
  },
  {
    name: "TB-500",
    researchFocus: "Synthetic thymosin β4 fragment that accelerates angiogenesis and joint recovery.",
    detailedDescription: "TB-500 is a synthetic fragment of thymosin β4 studied for its impact on angiogenesis, cell migration, and tissue repair. It's frequently used in preclinical research on joint health, soft-tissue recovery, and post-injury remodeling.",
    categories: ["recovery-performance", "longevity-wellness"],
    variants: [
      createVariant("5mg", 40, "/products/label-tb500-5mg-3ml.png"),
      createVariant("10mg", 70, "/products/label-tb500-10mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29113_AFFORD2NQWKZ",
  },
  {
    name: "Tesamorelin",
    researchFocus: "FDA-backed GHRH analog proven to reduce visceral adipose tissue.",
    detailedDescription: "Tesamorelin is an FDA-approved GHRH analog researched extensively for its effects on visceral adipose tissue (VAT). It's a key peptide in studies targeting central adiposity, liver fat, and cardiometabolic risk markers.",
    categories: ["hormone-growth", "weight-metabolic"],
    variants: [
      createVariant("10mg", 60, "/products/label-tesamorelin-10mg-3ml.png"),
      createVariant("20mg", 100, "/products/label-tesamorelin-20mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29111_AFFORDX6932D",
  },
  {
    name: "Tirzepatide",
    researchFocus: "Dual GIP/GLP-1 agonist for aggressive weight and cardiometabolic management.",
    detailedDescription: "Tirzepatide is a dual GIP/GLP-1 receptor agonist associated with robust weight reduction and metabolic improvements in clinical trials. It sits at the forefront of modern cardiometabolic research and combination incretin therapy.",
    categories: ["weight-metabolic"],
    isFeatured: true,
    variants: [
      createVariant("10mg", 80, "/products/label-tirzepatide-10mg-3ml.png"),
      createVariant("20mg", 140, "/products/label-tirzepatide-20mg-3ml.png"),
      createVariant("30mg", 180, "/products/label-tirzepatide-30mg-3ml.png"),
    ],
    testResultUrl: "https://chromate.org/verify?c=29099_AFFORD4CK48N",
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
