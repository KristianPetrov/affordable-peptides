export type MoleculeStructureSource =
    | {
        type: "pubchem";
        query: string;
        queryType?: "name" | "cid";
        recordType?: "auto" | "2d" | "3d";
    }
    | {
        type: "rcsb";
        pdbId: string;
    }
    | {
        type: "alphafold";
        uniprotId: string;
    }
    | {
        type: "url";
        url: string;
        format: "pdb" | "sdf";
    };

export type MoleculeDefinition = {
    slug: string;
    displayName: string;
    source: MoleculeStructureSource;
    subtitle?: string;
};

type MoleculeMap = Record<string, MoleculeDefinition[]>;

const sharedSources = {
    bpc157: {
        type: "pubchem",
        query: "BPC-157",
        recordType: "2d",
    },
    tb500: {
        type: "pubchem",
        queryType: "cid",
        query: "62707662",
        recordType: "2d",
    },
    ghkCu: {
        type: "pubchem",
        queryType: "cid",
        query: "378611",
        recordType: "2d",
    },
    kpv: {
        type: "pubchem",
        queryType: "cid",
        query: "125672",
    },
} satisfies Record<string, MoleculeStructureSource>;

const canonicalMolecules = {
    bpc157: {
        slug: "bpc-157",
        displayName: "BPC-157",
        source: sharedSources.bpc157,
    },
    tb500: {
        slug: "tb-500",
        displayName: "TB-500 (Thymosin β4)",
        source: sharedSources.tb500,
    },
    ghkCu: {
        slug: "ghk-cu",
        displayName: "GHK-Cu",
        source: sharedSources.ghkCu,
    },
    kpv: {
        slug: "kpv",
        displayName: "KPV (Lys-Pro-Val)",
        source: sharedSources.kpv,
    },
} satisfies Record<string, MoleculeDefinition>;

const withMolecule = (
    molecule: MoleculeDefinition,
    overrides: Partial<MoleculeDefinition> = {}
): MoleculeDefinition => ({
    ...molecule,
    ...overrides,
    source: overrides.source ?? molecule.source,
});

export const moleculesByProduct: MoleculeMap = {
    "AOD 9604": [
        {
            slug: "aod-9604",
            displayName: "AOD-9604 (HGH Fragment 176-191)",
            source: { type: "pubchem", query: "AOD-9604", recordType: "2d" },
        },
    ],
    "Bacteriostatic Water": [
        {
            slug: "water",
            displayName: "Water (H₂O)",
            source: { type: "pubchem", query: "Water" },
        },
        {
            slug: "benzyl-alcohol",
            displayName: "Benzyl Alcohol (0.9%)",
            source: { type: "pubchem", query: "Benzyl alcohol" },
        },
    ],
    "BPC + TB Combo": [
        withMolecule(canonicalMolecules.bpc157, {
            subtitle: "Body Protection Compound",
        }),
        withMolecule(canonicalMolecules.tb500, {
            subtitle: "Actin-binding repair peptide",
        }),
    ],
    "BPC-157": [
        canonicalMolecules.bpc157,
    ],
    "CJC-1295": [
        {
            slug: "cjc-1295",
            displayName: "CJC-1295",
            source: { type: "pubchem", query: "CJC-1295", recordType: "2d" },
        },
    ],
    Epithalon: [
        {
            slug: "epitalon",
            displayName: "Epitalon",
            source: { type: "pubchem", query: "Epitalon" },
        },
    ],
    "GHK-CU": [
        withMolecule(canonicalMolecules.ghkCu, {
            subtitle: "Copper tripeptide-1",
        }),
    ],
    "GLP-1": [
        {
            slug: "glp-1",
            displayName: "GLP-1 (7-36) amide",
            source: { type: "rcsb", pdbId: "1D0R" },
        },
    ],
    Glutathione: [
        {
            slug: "glutathione",
            displayName: "Reduced Glutathione",
            source: { type: "pubchem", query: "Glutathione" },
        },
    ],
    HCG: [
        {
            slug: "hcg",
            displayName: "Human Chorionic Gonadotropin",
            source: { type: "rcsb", pdbId: "1HCG" },
        },
    ],
    HGH: [
        {
            slug: "hgh",
            displayName: "Human Growth Hormone",
            source: { type: "rcsb", pdbId: "1HGU" },
        },
    ],
    "IGF-1 LR3": [
        {
            slug: "igf-1",
            displayName: "IGF-1 Backbone",
            subtitle: "LR3 variant shares the same fold",
            source: { type: "rcsb", pdbId: "1IGL" },
        },
    ],
    Ipamorelin: [
        {
            slug: "ipamorelin",
            displayName: "Ipamorelin",
            source: { type: "pubchem", query: "Ipamorelin", recordType: "2d" },
        },
    ],
    KPV: [canonicalMolecules.kpv],
    "L-Carnitine": [
        {
            slug: "l-carnitine",
            displayName: "L-Carnitine",
            source: { type: "pubchem", query: "L-carnitine" },
        },
    ],
    "Lipo-C": [
        {
            slug: "methionine",
            displayName: "Methionine",
            source: { type: "pubchem", query: "Methionine" },
        },
        {
            slug: "inositol",
            displayName: "Inositol",
            source: { type: "pubchem", query: "Inositol" },
        },
        {
            slug: "choline",
            displayName: "Choline",
            source: { type: "pubchem", query: "Choline" },
        },
        {
            slug: "b12",
            displayName: "Cyanocobalamin (B12)",
            source: { type: "pubchem", query: "Cyanocobalamin" },
        },
    ],
    "Lipo-C (No B12)": [
        {
            slug: "methionine",
            displayName: "Methionine",
            source: { type: "pubchem", query: "Methionine" },
        },
        {
            slug: "inositol",
            displayName: "Inositol",
            source: { type: "pubchem", query: "Inositol" },
        },
        {
            slug: "choline",
            displayName: "Choline",
            source: { type: "pubchem", query: "Choline" },
        },
    ],
    "MOTS-C": [
        {
            slug: "mots-c",
            displayName: "MOTS-c",
            source: { type: "pubchem", query: "MOTS-c", recordType: "2d" },
        },
    ],
    "NAD+": [
        {
            slug: "nad-plus",
            displayName: "NAD+",
            source: { type: "pubchem", query: "NAD+" },
        },
    ],
    Retatrutide: [
        {
            slug: "retatrutide",
            displayName: "Retatrutide",
            source: { type: "pubchem", query: "Retatrutide", recordType: "2d" },
        },
    ],
    "SLU-PP-332": [
        {
            slug: "slu-pp-332",
            displayName: "SLU-PP-332",
            source: { type: "pubchem", query: "SLU-PP-332" },
        },
    ],
    "TB-500": [canonicalMolecules.tb500],
    Tesamorelin: [
        {
            slug: "tesamorelin",
            displayName: "Tesamorelin",
            source: { type: "pubchem", query: "Tesamorelin", recordType: "2d" },
        },
    ],
    Tirzepatide: [
        {
            slug: "tirzepatide",
            displayName: "Tirzepatide",
            source: {
                type: "pubchem",
                queryType: "cid",
                query: "166567236",
                recordType: "2d",
            },
        },
    ],
    GLOW: [
        withMolecule(canonicalMolecules.bpc157, {
            slug: "glow-bpc-157",
            subtitle: "Included in GLOW blend",
        }),
        withMolecule(canonicalMolecules.tb500, {
            slug: "glow-tb-500",
            subtitle: "Included in GLOW blend",
        }),
        withMolecule(canonicalMolecules.ghkCu, {
            slug: "glow-ghk-cu",
            subtitle: "Included in GLOW blend",
        }),
    ],
    KLOW: [
        withMolecule(canonicalMolecules.ghkCu, {
            slug: "klow-ghk-cu",
            subtitle: "Included in KLOW blend",
        }),
        withMolecule(canonicalMolecules.kpv, {
            slug: "klow-kpv",
            subtitle: "Included in KLOW blend",
        }),
        withMolecule(canonicalMolecules.bpc157, {
            slug: "klow-bpc-157",
            subtitle: "Included in KLOW blend",
        }),
        withMolecule(canonicalMolecules.tb500, {
            slug: "klow-tb-500",
            subtitle: "Included in KLOW blend",
        }),
    ],
};

export const productsMissingMoleculeData: string[] = [];

export function getMoleculesForProduct (productName: string)
{
    return moleculesByProduct[productName] ?? [];
}

