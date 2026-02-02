const CASH_APP_TAG = "affordablepeptides";
const VENMO_USER = "payaffordablepeptides";
const CASH_APP_URL = `https://cash.app/$${CASH_APP_TAG}`;
const VENMO_URL = `https://venmo.com/u/${VENMO_USER}`;
const ZELLE_EMAIL = "payaffordablepeptides@gmail.com";
const ZELLE_RECIPIENT_NAME = "Affordable Holdings, Inc";



const CASH_APP_PERCENT_FEE = 0.026;
const CASH_APP_FLAT_FEE = 0.15;
const VENMO_PERCENT_FEE = 0.019;
const VENMO_FLAT_FEE = 0.1;

const roundToCents = (amount: number): number =>
    Math.round(amount * 100) / 100;

export function calculateCashAppTotal (amount: number): number
{
    if (!amount || amount <= 0) {
        return 0;
    }
    return roundToCents(amount * (1 + CASH_APP_PERCENT_FEE) + CASH_APP_FLAT_FEE);
}

export function calculateVenmoTotal (amount: number): number
{
    if (!amount || amount <= 0) {
        return 0;
    }
    return roundToCents(amount * (1 + VENMO_PERCENT_FEE) + VENMO_FLAT_FEE);
}

const formatPathAmount = (amount: number): string =>
    Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

const formatQueryAmount = (amount: number): string => amount.toFixed(2);

export function buildCashAppLink (amount?: number | null): string
{
    if (amount && amount > 0) {
        return `${CASH_APP_URL}/${formatPathAmount(amount)}`;
    }
    return CASH_APP_URL;
}

type VenmoLinkOptions = {
    amount?: number | null;
    note?: string | null;
};

export function buildVenmoLink (options?: VenmoLinkOptions): string
{
    const params = new URLSearchParams({ txn: "pay" });

    if (options?.amount && options.amount > 0) {
        params.set("amount", formatQueryAmount(options.amount));
    }

    if (options?.note) {
        params.set("note", options.note);
    }

    return `${VENMO_URL}?${params.toString()}`;
}

export
{
    CASH_APP_URL,
    VENMO_URL,
    ZELLE_EMAIL,
    ZELLE_RECIPIENT_NAME,
    CASH_APP_TAG,
    VENMO_USER,
    CASH_APP_PERCENT_FEE,
    CASH_APP_FLAT_FEE,
    VENMO_PERCENT_FEE,
    VENMO_FLAT_FEE,
};

