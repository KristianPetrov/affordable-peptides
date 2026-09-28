import "server-only";

import {
  getPayRamConfig,
  getPayRamOperationalConfig,
} from "./config";
import {
  PAYRAM_SETTLEMENT_ASSET,
  PAYRAM_SETTLEMENT_NETWORK,
  type PayRamProviderStatus,
} from "./constants";

type UnknownRecord = Record<string, unknown>;

export type CreatePayRamPaymentInput = {
  attemptId: string;
  customerEmail: string;
  customerId: string;
  amountInUsd: string;
  expiresAt: Date;
};

export type CreatePayRamPaymentResult = {
  referenceId: string;
  paymentUrl: string;
  host: string;
};

export type PayRamPaymentStatus = {
  invoiceId: string | null;
  customerId: string | null;
  referenceId: string | null;
  amountInUsd: string | null;
  paymentState: PayRamProviderStatus | null;
  currencySymbol: string | null;
  blockchainSymbol: string | null;
  tokenAddress: string | null;
  depositAddress: string | null;
  filledAmount: string | null;
  filledAmountInUsd: string | null;
  explorerTransaction: string | null;
  raw: UnknownRecord;
};

export class PayRamApiError extends Error {
  readonly ambiguous: boolean;
  readonly status: number | null;

  constructor(
    message: string,
    options: { ambiguous: boolean; status?: number | null; cause?: unknown }
  ) {
    super(message, { cause: options.cause });
    this.name = "PayRamApiError";
    this.ambiguous = options.ambiguous;
    this.status = options.status ?? null;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unwrapData(value: unknown): UnknownRecord {
  if (!isRecord(value)) {
    throw new PayRamApiError("PayRam returned a non-object response.", {
      ambiguous: true,
    });
  }

  return isRecord(value.data) ? value.data : value;
}

function stringValue(
  record: UnknownRecord,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function normalizeProviderStatus(value: string | null): PayRamProviderStatus | null {
  const normalized = value?.trim().toUpperCase();
  return normalized === "OPEN" ||
    normalized === "PARTIALLY_FILLED" ||
    normalized === "FILLED" ||
    normalized === "OVER_FILLED" ||
    normalized === "CANCELLED"
    ? normalized
    : null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJson(response: Response, ambiguous: boolean): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new PayRamApiError("PayRam returned an invalid JSON response.", {
      ambiguous,
      status: response.status,
      cause: error,
    });
  }
}

function validateCheckoutUrl(value: string): string {
  const config = getPayRamConfig();
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch (error) {
    throw new PayRamApiError("PayRam returned an invalid checkout URL.", {
      ambiguous: true,
      cause: error,
    });
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.origin.toLowerCase() !== config.checkoutOrigin.toLowerCase()
  ) {
    throw new PayRamApiError(
      "PayRam returned a checkout URL outside the configured origin.",
      { ambiguous: true }
    );
  }

  return parsed.toString();
}

export async function createPayRamPayment(
  input: CreatePayRamPaymentInput
): Promise<CreatePayRamPaymentResult> {
  const config = getPayRamConfig();
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${config.baseUrl}/api/v1/payment`,
      {
        method: "POST",
        headers: {
          "API-Key": config.apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key": input.attemptId,
        },
        body: JSON.stringify({
          customerEmail: input.customerEmail,
          customerID: input.customerId,
          amountInUSD: Number(input.amountInUsd),
          invoiceID: input.attemptId,
          expire: input.expiresAt.toISOString(),
          currency: PAYRAM_SETTLEMENT_ASSET,
          network: PAYRAM_SETTLEMENT_NETWORK,
        }),
      },
      config.requestTimeoutMs
    );
  } catch (error) {
    throw new PayRamApiError(
      "PayRam payment creation timed out or could not be reached.",
      { ambiguous: true, cause: error }
    );
  }

  const ambiguous = response.status >= 500 || response.status === 408;
  if (!response.ok) {
    throw new PayRamApiError(
      `PayRam rejected payment creation with HTTP ${response.status}.`,
      { ambiguous, status: response.status }
    );
  }

  const body = unwrapData(await parseJson(response, true));
  const referenceId = stringValue(body, "reference_id", "referenceID");
  const paymentUrl = stringValue(body, "url", "paymentURL", "paymentUrl");
  const host = stringValue(body, "host") ?? config.checkoutOrigin;

  if (!referenceId || !paymentUrl) {
    throw new PayRamApiError(
      "PayRam created a payment but omitted its reference or checkout URL.",
      { ambiguous: true, status: response.status }
    );
  }

  return {
    referenceId,
    paymentUrl: validateCheckoutUrl(paymentUrl),
    host,
  };
}

export async function getPayRamPaymentStatus(
  referenceId: string
): Promise<PayRamPaymentStatus> {
  const config = getPayRamOperationalConfig();
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        `${config.baseUrl}/api/v1/payment/reference/${encodeURIComponent(
          referenceId
        )}`,
        {
          method: "GET",
          headers: {
            "API-Key": config.apiKey,
            Accept: "application/json",
          },
        },
        config.requestTimeoutMs
      );

      if (!response.ok) {
        const retryable =
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;
        if (retryable && attempt < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * 2 ** attempt)
          );
          continue;
        }
        throw new PayRamApiError(
          `PayRam status lookup failed with HTTP ${response.status}.`,
          { ambiguous: true, status: response.status }
        );
      }

      const raw = unwrapData(await parseJson(response, true));
      return {
        invoiceId: stringValue(raw, "invoiceID", "invoice_id"),
        customerId: stringValue(raw, "customerID", "customer_id"),
        referenceId: stringValue(raw, "referenceID", "reference_id"),
        amountInUsd: stringValue(raw, "amountInUSD", "amount_in_usd", "amount"),
        paymentState: normalizeProviderStatus(
          stringValue(raw, "paymentState", "payment_state", "status")
        ),
        currencySymbol: stringValue(
          raw,
          "currencySymbol",
          "currency_symbol",
          "currency"
        ),
        blockchainSymbol: stringValue(
          raw,
          "blockchainSymbol",
          "blockchain_symbol",
          "network",
          "blockchain"
        ),
        tokenAddress: stringValue(
          raw,
          "currencyAddress",
          "currency_address",
          "tokenAddress",
          "token_address"
        ),
        depositAddress: stringValue(
          raw,
          "depositAddress",
          "deposit_address",
          "destinationAddress",
          "destination_address"
        ),
        filledAmount: stringValue(
          raw,
          "filledAmount",
          "filled_amount"
        ),
        filledAmountInUsd: stringValue(
          raw,
          "filledAmountInUSD",
          "filled_amount_in_usd"
        ),
        explorerTransaction: stringValue(
          raw,
          "explorerTransaction",
          "explorer_transaction",
          "transactionHash",
          "transaction_hash",
          "txHash"
        ),
        raw,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof PayRamApiError && error.status !== null) {
        throw error;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
      }
    }
  }

  throw new PayRamApiError(
    "PayRam status lookup timed out or could not be reached.",
    { ambiguous: true, cause: lastError }
  );
}
