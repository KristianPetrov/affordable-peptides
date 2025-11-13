export type Tier = {
  quantity: string;
  price: string;
};

export type Variant = {
  label: string;
  tiers: Tier[];
};

export type Product = {
  name: string;
  variants: Variant[];
  isFeatured?: boolean;
};

export const peptideProducts: Product[] = [
  {
    name: "AOD 9604",
    isFeatured: true,
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$50" },
          { quantity: "5", price: "$200" },
          { quantity: "10", price: "$350" },
        ],
      },
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$80" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$560" },
        ],
      },
    ],
  },
  {
    name: "Bacteriostatic Water",
    variants: [
      {
        label: "3ml",
        tiers: [
          { quantity: "1", price: "$2" },
          { quantity: "5", price: "$10" },
          { quantity: "10", price: "$20" },
        ],
      },
      {
        label: "10ml",
        tiers: [
          { quantity: "1", price: "$4" },
          { quantity: "5", price: "$20" },
          { quantity: "10", price: "$40" },
        ],
      },
    ],
  },
  {
    name: "BPC + TB Combo",
    variants: [
      {
        label: "5mg each",
        tiers: [
          { quantity: "1", price: "$50" },
          { quantity: "5", price: "$200" },
          { quantity: "10", price: "$350" },
        ],
      },
      {
        label: "10mg each",
        tiers: [
          { quantity: "1", price: "$80" },
          { quantity: "5", price: "$320" },
          { quantity: "10", price: "$560" },
        ],
      },
    ],
  },
  {
    name: "BPC-157",
    isFeatured: true,
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "CJC-1295",
    variants: [
      {
        label: "No DAC + IPA (10mg)",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
      {
        label: "With DAC (5mg)",
        tiers: [
          { quantity: "1", price: "$50" },
          { quantity: "5", price: "$200" },
          { quantity: "10", price: "$350" },
        ],
      },
      {
        label: "Without DAC (5mg)",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
      {
        label: "Without DAC (10mg)",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "Epithalon",
    variants: [
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$30" },
          { quantity: "5", price: "$100" },
          { quantity: "10", price: "$175" },
        ],
      },
      {
        label: "50mg",
        tiers: [
          { quantity: "1", price: "$80" },
          { quantity: "5", price: "$320" },
          { quantity: "10", price: "$560" },
        ],
      },
    ],
  },
  {
    name: "GHK-CU",
    variants: [
      {
        label: "50mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
      {
        label: "100mg",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "GLOW",
    variants: [
      {
        label: "70mg",
        tiers: [
          { quantity: "1", price: "$90" },
          { quantity: "5", price: "$360" },
          { quantity: "10", price: "$630" },
        ],
      },
    ],
  },
  {
    name: "GLP-1",
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
    ],
  },
  {
    name: "Glutathione",
    variants: [
      {
        label: "1500mg",
        tiers: [
          { quantity: "1", price: "$50" },
          { quantity: "5", price: "$200" },
          { quantity: "10", price: "$350" },
        ],
      },
    ],
  },
  {
    name: "HCG",
    variants: [
      {
        label: "10,000 IU",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$420" },
        ],
      },
    ],
  },
  {
    name: "HGH",
    variants: [
      {
        label: "100 IU kit",
        tiers: [
          { quantity: "1", price: "$200" },
          { quantity: "5", price: "$800" },
          { quantity: "10", price: "$1400" },
        ],
      },
      {
        label: "150 IU kit",
        tiers: [
          { quantity: "1", price: "$250" },
          { quantity: "5", price: "$1000" },
          { quantity: "10", price: "$1750" },
        ],
      },
    ],
  },
  {
    name: "IGF-1 LR3",
    variants: [
      {
        label: "1mg",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "Ipamorelin",
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$30" },
          { quantity: "5", price: "$120" },
          { quantity: "10", price: "$210" },
        ],
      },
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$50" },
          { quantity: "5", price: "$200" },
          { quantity: "10", price: "$350" },
        ],
      },
    ],
  },
  {
    name: "KLOW",
    variants: [
      {
        label: "80mg",
        tiers: [
          { quantity: "1", price: "$100" },
          { quantity: "5", price: "$400" },
          { quantity: "10", price: "$700" },
        ],
      },
    ],
  },
  {
    name: "KPV",
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$120" },
          { quantity: "10", price: "$210" },
        ],
      },
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "L-Carnitine",
    variants: [
      {
        label: "10ml (600mg/ml)",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$420" },
        ],
      },
    ],
  },
  {
    name: "Lipo-C",
    variants: [
      {
        label: "10ml",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$420" },
        ],
      },
    ],
  },
  {
    name: "Lipo-C (No B12)",
    variants: [
      {
        label: "10ml",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$420" },
        ],
      },
    ],
  },
  {
    name: "MOTS-C",
    variants: [
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
      {
        label: "40mg",
        tiers: [
          { quantity: "1", price: "$100" },
          { quantity: "5", price: "$400" },
          { quantity: "10", price: "$700" },
        ],
      },
    ],
  },
  {
    name: "NAD+",
    variants: [
      {
        label: "500mg",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
      {
        label: "1000mg",
        tiers: [
          { quantity: "1", price: "$100" },
          { quantity: "5", price: "$400" },
          { quantity: "10", price: "$700" },
        ],
      },
    ],
  },
  {
    name: "Retatrutide",
    variants: [
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$100" },
          { quantity: "5", price: "$400" },
          { quantity: "10", price: "$700" },
        ],
      },
      {
        label: "20mg",
        tiers: [
          { quantity: "1", price: "$160" },
          { quantity: "5", price: "$640" },
          { quantity: "10", price: "$1120" },
        ],
      },
      {
        label: "30mg",
        tiers: [
          { quantity: "1", price: "$200" },
          { quantity: "5", price: "$800" },
          { quantity: "10", price: "$1400" },
        ],
      },
    ],
  },
  {
    name: "SLU-PP-332",
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$80" },
          { quantity: "5", price: "$320" },
          { quantity: "10", price: "$560" },
        ],
      },
    ],
  },
  {
    name: "TB-500",
    variants: [
      {
        label: "5mg",
        tiers: [
          { quantity: "1", price: "$40" },
          { quantity: "5", price: "$160" },
          { quantity: "10", price: "$280" },
        ],
      },
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$70" },
          { quantity: "5", price: "$280" },
          { quantity: "10", price: "$490" },
        ],
      },
    ],
  },
  {
    name: "Tesamorelin",
    variants: [
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$60" },
          { quantity: "5", price: "$240" },
          { quantity: "10", price: "$420" },
        ],
      },
      {
        label: "20mg",
        tiers: [
          { quantity: "1", price: "$100" },
          { quantity: "5", price: "$400" },
          { quantity: "10", price: "$700" },
        ],
      },
    ],
  },
  {
    name: "Tirzepatide",
    isFeatured: true,
    variants: [
      {
        label: "10mg",
        tiers: [
          { quantity: "1", price: "$80" },
          { quantity: "5", price: "$320" },
          { quantity: "10", price: "$560" },
        ],
      },
      {
        label: "20mg",
        tiers: [
          { quantity: "1", price: "$140" },
          { quantity: "5", price: "$480" },
          { quantity: "10", price: "$840" },
        ],
      },
      {
        label: "30mg",
        tiers: [
          { quantity: "1", price: "$180" },
          { quantity: "5", price: "$720" },
          { quantity: "10", price: "$1260" },
        ],
      },
    ],
  },
];

export const featuredProducts = peptideProducts.filter(
  (product) => product.isFeatured
);

