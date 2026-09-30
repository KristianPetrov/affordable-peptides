import type { PayRamPaymentStatus } from "./client";
import {
  PAYRAM_SETTLEMENT_ASSET,
  PAYRAM_SETTLEMENT_NETWORK,
  isBaseAddress,
  isBaseTransactionHash,
  normalizeAddress,
  type PayRamAttemptStatus,
} from "./constants";

type UnknownRecord = Record<string, unknown>;

export type PayRamWebhookPaymentInfo = {
  sourceAddress: string | null;
  transactionHash: string | null;
  destinationAddress: string | null;
  blockNumber: number | null;
};

export type PayRamWebhookPayload = {
  customerId: string | null;
  invoiceId: string | null;
  referenceId: string;
  status: string;
  amount: string | null;
  currency: string | null;
  filledAmount: string | null;
  filledAmountInUsd: string | null;
  timestamp: number | null;
  paymentInfo: PayRamWebhookPaymentInfo[];
  confirmationCurrent: number;
  confirmationRequired: number;
  raw: UnknownRecord;
};

export type PayRamVerificationInput = {
  attemptId: string;
  orderId: string;
  providerReference: string;
  invoiceAmount: string;
  settlementAsset: string;
  settlementNetwork: string;
  expectedTokenAddress: string;
  status: PayRamPaymentStatus;
  webhook?: PayRamWebhookPayload | null;
};

export type PayRamVerificationDecision = {
  attemptStatus: PayRamAttemptStatus;
  providerStatus: string;
  shouldPay: boolean;
  reviewReason: string | null;
  tokenAddress: string | null;
  receivingAddress: string | null;
  filledAmount: string | null;
  filledAmountUsd: string | null;
  transactionHashes: string[];
  confirmationCurrent: number;
  confirmationRequired: number;
  providerTimestamp: Date | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function numberValue(
  record: UnknownRecord,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export function parsePayRamWebhookPayload(
  value: unknown
): PayRamWebhookPayload {
  if (!isRecord(value)) {
    throw new Error("PayRam webhook payload must be a JSON object.");
  }

  const referenceId = stringValue(value, "reference_id", "referenceID");
  const status = stringValue(value, "status", "paymentState");
  if (!referenceId || !status) {
    throw new Error("PayRam webhook is missing reference_id or status.");
  }

  const rawPaymentInfo = Array.isArray(value.payment_info)
    ? value.payment_info
    : Array.isArray(value.paymentInfo)
      ? value.paymentInfo
      : [];
  const paymentInfo = rawPaymentInfo
    .filter(isRecord)
    .map((entry) => ({
      sourceAddress: stringValue(entry, "source_address", "sourceAddress"),
      transactionHash: stringValue(
        entry,
        "transaction_hash",
        "transactionHash",
        "txHash"
      ),
      destinationAddress: stringValue(
        entry,
        "destination_address",
        "destinationAddress"
      ),
      blockNumber: numberValue(entry, "block_number", "blockNumber"),
    }));

  return {
    customerId: stringValue(value, "customer_id", "customerID"),
    invoiceId: stringValue(value, "invoice_id", "invoiceID"),
    referenceId,
    status: status.toUpperCase(),
    amount: stringValue(value, "amount", "amountInUSD"),
    currency: stringValue(value, "currency", "currencySymbol"),
    filledAmount: stringValue(value, "filled_amount", "filledAmount"),
    filledAmountInUsd: stringValue(
      value,
      "filled_amount_in_usd",
      "filledAmountInUSD"
    ),
    timestamp: numberValue(value, "timestamp"),
    paymentInfo,
    confirmationCurrent:
      numberValue(value, "confirmation_current", "confirmationCurrent") ?? 0,
    confirmationRequired:
      numberValue(value, "confirmation_required", "confirmationRequired") ?? 0,
    raw: value,
  };
}

function decimalToUnits(value: string, scale = 18): bigint | null {
  const normalized = value.trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(normalized);
  if (!match) {
    return null;
  }

  const fraction = match[3] ?? "";
  if (fraction.length > scale) {
    const discarded = fraction.slice(scale);
    if (/[1-9]/.test(discarded)) {
      return null;
    }
  }

  const sign = match[1] === "-" ? BigInt(-1) : BigInt(1);
  const whole = BigInt(match[2]);
  const paddedFraction = fraction.slice(0, scale).padEnd(scale, "0");
  const units =
    whole * BigInt(10) ** BigInt(scale) +
    BigInt(paddedFraction || "0");
  return units * sign;
}

export function decimalAmountsEqual(
  left: string | null | undefined,
  right: string | null | undefined
): boolean {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }

  const leftUnits = decimalToUnits(left);
  const rightUnits = decimalToUnits(right);
  return leftUnits !== null && rightUnits !== null && leftUnits === rightUnits;
}

/** True when `value` is at least `minimum` minus one cent of rounding. */
export function decimalAtLeast(
  value: string | null | undefined,
  minimum: string
): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  const valueUnits = decimalToUnits(value);
  const minimumUnits = decimalToUnits(minimum);
  const cent = BigInt(10) ** BigInt(16);
  return (
    valueUnits !== null &&
    minimumUnits !== null &&
    valueUnits >= minimumUnits - cent
  );
}

function extractTransactionHashes(
  status: PayRamPaymentStatus,
  webhook?: PayRamWebhookPayload | null
): string[] {
  const candidates = [
    status.explorerTransaction,
    ...((webhook?.paymentInfo ?? []).map((entry) => entry.transactionHash)),
    stringValue(status.raw, "transactionHash", "transaction_hash", "txHash"),
  ].filter((value): value is string => Boolean(value));

  const hashes = new Set<string>();
  for (const candidate of candidates) {
    const direct = candidate.trim();
    if (isBaseTransactionHash(direct)) {
      hashes.add(direct.toLowerCase());
      continue;
    }

    const embedded = direct.match(/0x[a-fA-F0-9]{64}/g) ?? [];
    for (const hash of embedded) {
      if (isBaseTransactionHash(hash)) {
        hashes.add(hash.toLowerCase());
      }
    }
  }
  return [...hashes];
}

function reviewDecision(
  input: PayRamVerificationInput,
  reason: string,
  transactionHashes: string[]
): PayRamVerificationDecision {
  const webhook = input.webhook;
  return {
    attemptStatus: "REVIEW_REQUIRED",
    providerStatus: input.status.paymentState ?? webhook?.status ?? "UNKNOWN",
    shouldPay: false,
    reviewReason: reason,
    tokenAddress: input.status.tokenAddress,
    receivingAddress: input.status.depositAddress,
    filledAmount: input.status.filledAmount ?? webhook?.filledAmount ?? null,
    filledAmountUsd:
      input.status.filledAmountInUsd ?? webhook?.filledAmountInUsd ?? null,
    transactionHashes,
    confirmationCurrent: webhook?.confirmationCurrent ?? 0,
    confirmationRequired: webhook?.confirmationRequired ?? 0,
    providerTimestamp:
      webhook?.timestamp && webhook.timestamp > 0
        ? new Date(webhook.timestamp * 1000)
        : null,
  };
}

export function verifyPayRamPayment(
  input: PayRamVerificationInput
): PayRamVerificationDecision {
  const { status, webhook } = input;
  const transactionHashes = extractTransactionHashes(status, webhook);
  const providerStatus = status.paymentState ?? "UNKNOWN";

  if (
    status.referenceId &&
    status.referenceId.trim() !== input.providerReference
  ) {
    return reviewDecision(input, "PROVIDER_REFERENCE_MISMATCH", transactionHashes);
  }
  if (status.invoiceId && status.invoiceId.trim() !== input.attemptId) {
    return reviewDecision(input, "INVOICE_MISMATCH", transactionHashes);
  }
  if (status.customerId && status.customerId.trim() !== input.orderId) {
    return reviewDecision(input, "ORDER_ASSOCIATION_MISMATCH", transactionHashes);
  }
  if (
    status.amountInUsd &&
    !decimalAmountsEqual(status.amountInUsd, input.invoiceAmount)
  ) {
    return reviewDecision(input, "INVOICE_AMOUNT_MISMATCH", transactionHashes);
  }
  if (webhook?.invoiceId && webhook.invoiceId !== input.attemptId) {
    return reviewDecision(input, "WEBHOOK_INVOICE_MISMATCH", transactionHashes);
  }
  if (webhook?.customerId && webhook.customerId !== input.orderId) {
    return reviewDecision(input, "WEBHOOK_ORDER_MISMATCH", transactionHashes);
  }

  if (providerStatus === "PARTIALLY_FILLED") {
    return {
      ...reviewDecision(input, "PARTIAL_PAYMENT", transactionHashes),
      attemptStatus: "PARTIALLY_FILLED",
      reviewReason: null,
    };
  }

  if (providerStatus === "CANCELLED") {
    return {
      ...reviewDecision(input, "PROVIDER_CANCELLED", transactionHashes),
      attemptStatus: "CANCELLED",
      reviewReason: null,
    };
  }

  if (providerStatus === "OPEN") {
    const isConfirming =
      (webhook?.confirmationCurrent ?? 0) > 0 || transactionHashes.length > 0;
    return {
      ...reviewDecision(input, "OPEN", transactionHashes),
      attemptStatus: isConfirming ? "CONFIRMING" : "OPEN",
      reviewReason: null,
    };
  }

  if (providerStatus !== "FILLED" && providerStatus !== "OVER_FILLED") {
    return reviewDecision(input, "UNKNOWN_PROVIDER_STATUS", transactionHashes);
  }

  const asset = status.currencySymbol?.toUpperCase();
  const network = status.blockchainSymbol?.toUpperCase();
  if (
    asset !== PAYRAM_SETTLEMENT_ASSET ||
    asset !== input.settlementAsset.toUpperCase()
  ) {
    return reviewDecision(input, "SETTLEMENT_ASSET_MISMATCH", transactionHashes);
  }
  if (
    network !== PAYRAM_SETTLEMENT_NETWORK ||
    network !== input.settlementNetwork.toUpperCase()
  ) {
    return reviewDecision(
      input,
      "SETTLEMENT_NETWORK_MISMATCH",
      transactionHashes
    );
  }
  // PayRam may omit the contract address; when it is present it must be
  // native Base USDC rather than a look-alike token.
  if (
    status.tokenAddress &&
    (!isBaseAddress(status.tokenAddress) ||
      normalizeAddress(status.tokenAddress) !==
        normalizeAddress(input.expectedTokenAddress))
  ) {
    return reviewDecision(input, "USDC_TOKEN_MISMATCH", transactionHashes);
  }
  if (
    webhook?.currency &&
    webhook.currency.toUpperCase() !== PAYRAM_SETTLEMENT_ASSET
  ) {
    return reviewDecision(input, "WEBHOOK_ASSET_MISMATCH", transactionHashes);
  }
  const settledAmount = status.filledAmount ?? webhook?.filledAmount ?? null;
  const settledAmountUsd =
    status.filledAmountInUsd ?? webhook?.filledAmountInUsd ?? null;
  if (
    !decimalAtLeast(settledAmount, input.invoiceAmount) &&
    !decimalAtLeast(settledAmountUsd, input.invoiceAmount)
  ) {
    return reviewDecision(input, "SETTLED_AMOUNT_MISMATCH", transactionHashes);
  }
  if (status.depositAddress && !isBaseAddress(status.depositAddress)) {
    return reviewDecision(input, "INVALID_RECEIVING_ADDRESS", transactionHashes);
  }

  const destinationMismatch = Boolean(status.depositAddress) &&
    (webhook?.paymentInfo ?? []).some(
      (entry) =>
        entry.destinationAddress &&
        (!isBaseAddress(entry.destinationAddress) ||
          normalizeAddress(entry.destinationAddress) !==
            normalizeAddress(status.depositAddress!))
    );
  if (destinationMismatch) {
    return reviewDecision(
      input,
      "RECEIVING_ADDRESS_MISMATCH",
      transactionHashes
    );
  }

  // An overpaid order is still paid in full. It is released for fulfillment
  // and flagged so an admin can refund the excess.
  const overpaid = providerStatus === "OVER_FILLED";
  return {
    attemptStatus: overpaid ? "OVER_FILLED" : "FILLED",
    providerStatus,
    shouldPay: true,
    reviewReason: overpaid ? "EXCESS_PAYMENT" : null,
    tokenAddress: status.tokenAddress,
    receivingAddress: status.depositAddress,
    filledAmount: status.filledAmount ?? webhook?.filledAmount ?? null,
    filledAmountUsd:
      status.filledAmountInUsd ?? webhook?.filledAmountInUsd ?? null,
    transactionHashes,
    confirmationCurrent: webhook?.confirmationCurrent ?? 0,
    confirmationRequired: webhook?.confirmationRequired ?? 0,
    providerTimestamp:
      webhook?.timestamp && webhook.timestamp > 0
        ? new Date(webhook.timestamp * 1000)
        : null,
  };
}
