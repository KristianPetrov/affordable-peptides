const CASH_APP_TAG = "affordablepeptides";
const VENMO_USER = "payaffordablepeptides";
const CASH_APP_URL = `https://cash.app/$${CASH_APP_TAG}`;
const VENMO_URL = `https://venmo.com/u/${VENMO_USER}`;
const ZELLE_EMAIL = "payaffordablepeptides@gmail.com";
const ZELLE_RECIPIENT_NAME = "Vincent Thayer";

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
};

