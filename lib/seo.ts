import type { Product, Variant } from "./products";

type SitemapChangeFrequency =
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";

export type MarketingRoute = {
    path: string;
    changeFrequency?: SitemapChangeFrequency;
    priority?: number;
};

const DEFAULT_SITE_NAME = "Affordable Peptides";
const DEFAULT_SITE_URL = "https://affordablepeptides.life";
const DEFAULT_DESCRIPTION =
    "Affordable Peptides delivers high-purity, research-grade peptides backed by transparent testing, fair pricing, and science-first integrity.";
const DEFAULT_TAGLINE =
    "High-purity, research-grade peptides delivered with honesty, transparency, and uncompromising quality.";

export const siteMetadata = {
    name: DEFAULT_SITE_NAME,
    legalName: DEFAULT_SITE_NAME,
    url: DEFAULT_SITE_URL,
    description: DEFAULT_DESCRIPTION,
    tagline: DEFAULT_TAGLINE,
    locale: "en-US",
    localeOg: "en_US",
    phone: "+1-951-539-3821",
    phoneDisplay: "(951) 539-3821",
    smsLink: "sms:9515393821",
    logoPath: "/affordable-peptides-logo-transparent.png",
    socialImagePath: "/opengraph-image",
    keywords: [
        "peptides",
        "research-grade peptides",
        "third-party tested peptides",
        "affordable peptides",
        "peptide research supplies",
        "peptide transparency",
        "lab verified peptides",
        "tirzepatide",
        "retatrutide",
        "GLP-1",
    ],
} as const;

export const FALLBACK_PRODUCT_IMAGE = "/affordable-peptides-example-product.png";
export const DEFAULT_PRICE_CURRENCY = "USD";

export const primaryNavigation: Array<{ name: string; path: string }> = [
    { name: "Home", path: "/" },
    { name: "Store", path: "/store" },
    { name: "Order Lookup", path: "/order-lookup" },
];

export const marketingRoutes: MarketingRoute[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/store", changeFrequency: "daily", priority: 0.9 },
    { path: "/order-lookup", changeFrequency: "monthly", priority: 0.4 },
];

export const robotsDisallowPaths = [
    "/account",
    "/account/",
    "/admin",
    "/checkout",
    "/api",
] as const;

const SCHEMA_CONTEXT = "https://schema.org";
const ANGLE_BRACKET_REGEX = /</g;
const NUMBER_SCRUB_REGEX = /[^\d.]/g;

const sanitizeNumericString = (value: string): number =>
{
    const parsed = Number(value.replace(NUMBER_SCRUB_REGEX, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

type SchemaOffer = {
    "@type": "Offer";
    priceCurrency: string;
    price: number;
    availability: string;
    url: string;
    sku: string;
    itemCondition: string;
};

const resolveVariantBasePrice = (variant: Variant): number | null =>
{
    const sortedTiers = [...variant.tiers]
        .map((tier) =>
        {
            const price = sanitizeNumericString(tier.price);
            const quantity = sanitizeNumericString(tier.quantity) || 1;
            return { price, quantity };
        })
        .filter((tier) => tier.price > 0)
        .sort((a, b) =>
        {
            if (a.quantity === b.quantity) {
                return a.price - b.price;
            }
            return a.quantity - b.quantity;
        });

    if (sortedTiers.length === 0) {
        return null;
    }

    return sortedTiers[0].price;
};

const resolveVariantAvailability = (variant: Variant): string =>
{
    if (typeof variant.stockQuantity === "number") {
        return variant.stockQuantity > 0 ? "InStock" : "OutOfStock";
    }
    return "PreOrder";
};

export const absoluteUrl = (path = "/"): string =>
{
    try {
        return new URL(path, siteMetadata.url).toString();
    } catch {
        return siteMetadata.url;
    }
};

const socialImageUrl = absoluteUrl(siteMetadata.socialImagePath);

export const organizationJsonLd = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    name: siteMetadata.name,
    legalName: siteMetadata.legalName,
    url: siteMetadata.url,
    logo: absoluteUrl(siteMetadata.logoPath),
    image: [socialImageUrl],
    description: siteMetadata.description,
    contactPoint: [
        {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: siteMetadata.phone,
            availableLanguage: ["English"],
        },
    ],
} as const;

export const websiteJsonLd = {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: siteMetadata.name,
    url: siteMetadata.url,
    inLanguage: siteMetadata.locale,
    description: siteMetadata.tagline,
    image: socialImageUrl,
    publisher: {
        "@type": "Organization",
        name: siteMetadata.name,
        logo: absoluteUrl(siteMetadata.logoPath),
    },
    hasPart: primaryNavigation.map((link) => ({
        "@type": "WebPage",
        name: link.name,
        url: absoluteUrl(link.path),
    })),
} as const;

export const serializeJsonLd = (data: unknown): string =>
    JSON.stringify(data).replace(ANGLE_BRACKET_REGEX, "\\u003c");

type ProductJsonLdOptions = {
    product: Product;
    productUrl: string;
    imageUrl: string;
    keywords?: string[];
};

export const createProductJsonLd = ({
    product,
    productUrl,
    imageUrl,
    keywords = [],
}: ProductJsonLdOptions) =>
{
    const offers: SchemaOffer[] = product.variants
        .map((variant) =>
        {
            const price = resolveVariantBasePrice(variant);
            if (!price) {
                return null;
            }
            return {
                "@type": "Offer",
                priceCurrency: DEFAULT_PRICE_CURRENCY,
                price,
                availability: `${SCHEMA_CONTEXT}/${resolveVariantAvailability(variant)}`,
                url: `${productUrl}#variant=${encodeURIComponent(variant.label)}`,
                sku: `${product.slug}-${variant.label}`.toLowerCase(),
                itemCondition: `${SCHEMA_CONTEXT}/NewCondition`,
            } satisfies SchemaOffer;
        })
        .filter((offer): offer is SchemaOffer => Boolean(offer));

    const description = product.detailedDescription ?? product.researchFocus;

    return {
        "@context": SCHEMA_CONTEXT,
        "@type": "Product",
        name: product.name,
        description,
        sku: product.slug,
        url: productUrl,
        image: [imageUrl],
        brand: {
            "@type": "Organization",
            name: siteMetadata.name,
            url: siteMetadata.url,
        },
        isFamilyFriendly: true,
        keywords: keywords.length ? keywords.join(", ") : undefined,
        category: product.categories.join(", "),
        audience: {
            "@type": "Audience",
            audienceType: "Professional researchers",
        },
        additionalProperty: (() =>
        {
            const variantProperties =
                product.variants
                    .filter((variant) => Boolean(variant.testResultUrl))
                    .map((variant) => ({
                        "@type": "PropertyValue",
                        name: `Chromate certificate (${variant.label})`,
                        value: variant.testResultUrl!,
                    })) ?? [];

            const baseProperties = product.testResultUrl
                ? [
                    {
                        "@type": "PropertyValue",
                        name: "Chromate certificate",
                        value: product.testResultUrl,
                    },
                ]
                : [];

            const combined = [...baseProperties, ...variantProperties];
            return combined.length ? combined : undefined;
        })(),
        offers: offers.length ? offers : undefined,
    };
};

