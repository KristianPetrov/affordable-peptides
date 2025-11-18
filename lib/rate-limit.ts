type RateLimitKeyPart = string | number | boolean | null | undefined;

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

export type RateLimitCheck = {
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterMs: number;
    windowMs: number;
};

export type MemoryRateLimiterOptions = {
    name: string;
    windowMs: number;
    max: number;
};

export type MemoryRateLimiter = {
    check: (parts: RateLimitKeyPart[]) => RateLimitCheck;
    options: MemoryRateLimiterOptions;
};

function parsePositiveInteger (
    value: string | number | undefined,
    fallback: number
): number
{
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number.parseInt(value, 10)
                : Number.NaN;

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

function normalizePart (part: RateLimitKeyPart): string | null
{
    if (part === null || part === undefined) {
        return null;
    }

    if (typeof part === "string") {
        const trimmed = part.trim().toLowerCase();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof part === "boolean") {
        return part ? "1" : "0";
    }

    if (typeof part === "number") {
        if (!Number.isFinite(part)) {
            return null;
        }

        return part.toString();
    }

    return null;
}

export function createMemoryRateLimiter (
    options: MemoryRateLimiterOptions
): MemoryRateLimiter
{
    const windowMs = Math.max(1_000, parsePositiveInteger(options.windowMs, 60_000));
    const max = Math.max(1, parsePositiveInteger(options.max, 1));
    const name = options.name.trim().toLowerCase() || "rate-limit";
    const store = new Map<string, RateLimitBucket>();

    function buildKey (parts: RateLimitKeyPart[]): string
    {
        const normalizedParts = parts
            .map(normalizePart)
            .filter((part): part is string => part !== null);

        if (normalizedParts.length === 0) {
            return name;
        }

        return [name, ...normalizedParts].join(":");
    }

    function check (parts: RateLimitKeyPart[]): RateLimitCheck
    {
        const key = buildKey(parts);
        const now = Date.now();
        const bucket = store.get(key);

        if (!bucket || bucket.resetAt <= now) {
            const resetAt = now + windowMs;
            store.set(key, { count: 1, resetAt });
            return {
                success: true,
                limit: max,
                remaining: Math.max(0, max - 1),
                resetAt,
                retryAfterMs: 0,
                windowMs,
            };
        }

        if (bucket.count >= max) {
            return {
                success: false,
                limit: max,
                remaining: 0,
                resetAt: bucket.resetAt,
                retryAfterMs: Math.max(0, bucket.resetAt - now),
                windowMs,
            };
        }

        bucket.count += 1;
        store.set(key, bucket);

        return {
            success: true,
            limit: max,
            remaining: Math.max(0, max - bucket.count),
            resetAt: bucket.resetAt,
            retryAfterMs: 0,
            windowMs,
        };
    }

    return {
        check,
        options: {
            name,
            windowMs,
            max,
        },
    };
}

export type HeaderLike = {
    get: (name: string) => string | null | undefined;
};

export function extractClientIp (
    headerSource: HeaderLike | null | undefined,
    fallback = "unknown"
): string
{
    if (!headerSource) {
        return fallback;
    }

    const candidates = [
        headerSource.get("x-forwarded-for")?.split(",")[0],
        headerSource.get("x-real-ip"),
        headerSource.get("cf-connecting-ip"),
        headerSource.get("fastly-client-ip"),
        headerSource.get("true-client-ip"),
    ];

    for (const candidate of candidates) {
        if (candidate) {
            const normalized = candidate.trim();
            if (normalized.length > 0) {
                return normalized;
            }
        }
    }

    return fallback;
}

const ORDER_RATE_LIMIT_MAX_REQUESTS = parsePositiveInteger(
    process.env.ORDER_RATE_LIMIT_MAX_REQUESTS,
    10
);
const ORDER_RATE_LIMIT_WINDOW_MS = parsePositiveInteger(
    process.env.ORDER_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
);

export const orderCreationRateLimiter = createMemoryRateLimiter({
    name: "order-create",
    windowMs: ORDER_RATE_LIMIT_WINDOW_MS,
    max: ORDER_RATE_LIMIT_MAX_REQUESTS,
});


