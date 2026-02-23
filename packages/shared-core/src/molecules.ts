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
    fallbackSource?: MoleculeStructureSource;
    subtitle?: string;
};

type MoleculeMap = Record<string, MoleculeDefinition[]>;

type PubChemOptions = {
    queryType?: "name" | "cid";
    recordType?: "auto" | "2d" | "3d";
};

const localSource = (
    assetSlug: string,
    format: "sdf" | "pdb" = "sdf"
): Extract<MoleculeStructureSource, { type: "url" }> => ({
    type: "url",
    url: `/molecules/${assetSlug}.${format}`,
    format,
});

const pubchemSource = (
    query: string,
    options: PubChemOptions = {}
): Extract<MoleculeStructureSource, { type: "pubchem" }> => ({
    type: "pubchem",
    query,
    ...(options.queryType ? { queryType: options.queryType } : {}),
    ...(options.recordType ? { recordType: options.recordType } : {}),
});

const rcsbSource = (
    pdbId: string
): Extract<MoleculeStructureSource, { type: "rcsb" }> => ({
    type: "rcsb",
    pdbId,
});

type LocalMoleculeOptions = {
    assetSlug?: string;
    format?: "sdf" | "pdb";
    fallback: MoleculeStructureSource;
    subtitle?: string;
};

const createLocalMoleculeDefinition = (
    slug: string,
    displayName: string,
    options: LocalMoleculeOptions
): MoleculeDefinition => ({
    slug,
    displayName,
    subtitle: options.subtitle,
    source: localSource(options.assetSlug ?? slug, options.format ?? "sdf"),
    fallbackSource: options.fallback,
});

const canonicalMolecules = {
    bpc157: createLocalMoleculeDefinition("bpc-157", "BPC-157", {
        fallback: pubchemSource("BPC-157", { recordType: "2d" }),
    }),
    tb500: createLocalMoleculeDefinition("tb-500", "TB-500 (Thymosin β4)", {
        fallback: pubchemSource("62707662", {
            queryType: "cid",
            recordType: "2d",
        }),
    }),
    ghkCu: createLocalMoleculeDefinition("ghk-cu", "GHK-Cu", {
        fallback: pubchemSource("378611", {
            queryType: "cid",
            recordType: "3d",
        }),
    }),
    kpv: createLocalMoleculeDefinition("kpv", "KPV (Lys-Pro-Val)", {
        fallback: pubchemSource("125672", { queryType: "cid" }),
    }),
} satisfies Record<string, MoleculeDefinition>;

const withMolecule = (
    molecule: MoleculeDefinition,
    overrides: Partial<MoleculeDefinition> = {}
): MoleculeDefinition => ({
    ...molecule,
    ...overrides,
    source: overrides.source ?? molecule.source,
    fallbackSource: overrides.fallbackSource ?? molecule.fallbackSource,
});

export const moleculesByProduct: MoleculeMap = {
    "5-Amino-1MQ": [

        createLocalMoleculeDefinition(
            "5-amino-1q-iodide",
            "5-Amino-1-methylquinolinium iodide",
            {
                subtitle: "Common iodide salt form (NNMTi)",
                fallback: pubchemSource("66522933", { queryType: "cid" }),
            }
        ),
    ],
    "AOD 9604": [
        createLocalMoleculeDefinition(
            "aod-9604",
            "AOD-9604 (HGH Fragment 176-191)",
            {
                fallback: pubchemSource("AOD-9604", { recordType: "2d" }),
            }
        ),
    ],
    "Bacteriostatic Water": [createLocalMoleculeDefinition("water", "Water (H₂O)", {
        fallback: pubchemSource("Water"),
    }), createLocalMoleculeDefinition(
        "benzyl-alcohol",
        "Benzyl Alcohol (0.9%)",
        {
            fallback: pubchemSource("Benzyl alcohol"),
        }
    ),


    ],
    "Vitamin B12 1mg/mL - 10ml Bottle": [
        createLocalMoleculeDefinition("b12", "Cyanocobalamin (B12)", {
            fallback: pubchemSource("Cyanocobalamin"),
        }),
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
        createLocalMoleculeDefinition("cjc-1295", "CJC-1295", {
            fallback: pubchemSource("CJC-1295", { recordType: "2d" }),
        }),
    ],
    Epithalon: [
        createLocalMoleculeDefinition("epitalon", "Epitalon", {
            fallback: pubchemSource("Epitalon"),
        }),
    ],
    "GHK-CU": [
        withMolecule(canonicalMolecules.ghkCu, {
            subtitle: "Copper tripeptide-1",
        }),
    ],
    "GHRP-2": [
        createLocalMoleculeDefinition("ghrp-2", "GHRP-2 (Growth Hormone Releasing Peptide-2)", {
            fallback: pubchemSource("GHRP-2", { recordType: "2d" }),
        }),
    ],
    // "GLP-1": [
    //     createLocalMoleculeDefinition("glp-1", "GLP-1 (7-36) amide", {
    //         format: "pdb",
    //         fallback: rcsbSource("1D0R"),
    //     }),
    // ],
    Glutathione: [
        createLocalMoleculeDefinition(
            "glutathione",
            "Reduced Glutathione",
            {
                fallback: pubchemSource("Glutathione"),
            }
        ),
    ],
    HCG: [
        createLocalMoleculeDefinition(
            "hcg",
            "Human Chorionic Gonadotropin",
            {
                format: "pdb",
                fallback: rcsbSource("1HCG"),
            }
        ),
    ],
    HGH: [
        createLocalMoleculeDefinition("hgh", "Human Growth Hormone", {
            format: "pdb",
            fallback: rcsbSource("1HGU"),
        }),
    ],
    "IGF-1 LR3": [
        createLocalMoleculeDefinition("igf-1", "IGF-1 Backbone", {
            format: "pdb",
            fallback: rcsbSource("1IGL"),
            subtitle: "LR3 variant shares the same fold",
        }),
    ],
    Ipamorelin: [
        createLocalMoleculeDefinition("ipamorelin", "Ipamorelin", {
            fallback: pubchemSource("Ipamorelin", { recordType: "2d" }),
        }),
    ],
    KPV: [canonicalMolecules.kpv],
    "L-Carnitine": [
        createLocalMoleculeDefinition("l-carnitine", "L-Carnitine", {
            fallback: pubchemSource("L-carnitine"),
        }),
    ],
    "Lipo-C": [
        createLocalMoleculeDefinition("methionine", "Methionine", {
            subtitle: "Included in both options",
            fallback: pubchemSource("Methionine"),
        }),
        createLocalMoleculeDefinition("inositol", "Inositol", {
            subtitle: "Included in both options",
            fallback: pubchemSource("Inositol"),
        }),
        createLocalMoleculeDefinition("choline", "Choline", {
            subtitle: "Included in both options",
            fallback: pubchemSource("Choline"),
        }),
        {
            slug: "l-carnitine",
            displayName: "L-Carnitine",
            subtitle: "Included in both options",
            source: pubchemSource("10219816", {
                queryType: "cid",
                recordType: "2d",
            }),
        },
        {
            slug: "l-arginine",
            displayName: "L-Arginine",
            subtitle: "Included in both options",
            source: pubchemSource("6322", {
                queryType: "cid",
                recordType: "3d",
            }),
        },
        {
            slug: "dexpanthenol",
            displayName: "Dexpanthenol (Vitamin B5)",
            subtitle: "Included in both options",
            source: pubchemSource("131204", {
                queryType: "cid",
                recordType: "3d",
            }),
        },
        createLocalMoleculeDefinition("b12", "Cyanocobalamin (B12)", {
            subtitle: "Included in With B12 option",
            fallback: pubchemSource("Cyanocobalamin"),
        }),
    ],
    "MOTS-C": [
        createLocalMoleculeDefinition("mots-c", "MOTS-c", {
            fallback: pubchemSource("MOTS-c", { recordType: "2d" }),
        }),
    ],
    "NAD+": [
        createLocalMoleculeDefinition("nad-plus", "NAD+", {
            fallback: pubchemSource("NAD+"),
        }),
    ],
    Retatrutide: [
        createLocalMoleculeDefinition("retatrutide", "Retatrutide", {
            fallback: pubchemSource("Retatrutide", { recordType: "2d" }),
        }),
    ],
    Selank: [
        createLocalMoleculeDefinition("selank", "Selank", {
            fallback: pubchemSource("11765600", { queryType: "cid" }),
        }),
    ],
    Semax: [
        createLocalMoleculeDefinition("semax", "Semax", {
            fallback: pubchemSource("9811102", { queryType: "cid" }),
        }),
    ],
    Sermorelin: [createLocalMoleculeDefinition("sermorelin", "Sermorelin", { fallback: pubchemSource("16132413", { queryType: "cid", recordType: "2d" }) }),
    ],
    "SLU-PP-332": [
        createLocalMoleculeDefinition("slu-pp-332", "SLU-PP-332", {
            fallback: pubchemSource("SLU-PP-332"),
        }),
    ],
    "TB-500": [canonicalMolecules.tb500],
    Tesamorelin: [
        createLocalMoleculeDefinition("tesamorelin", "Tesamorelin", {
            fallback: pubchemSource("Tesamorelin", { recordType: "2d" }),
        }),
    ],
    Tirzepatide: [
        createLocalMoleculeDefinition("tirzepatide", "Tirzepatide", {
            fallback: pubchemSource("166567236", {
                queryType: "cid",
                recordType: "2d",
            }),
        }),
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

