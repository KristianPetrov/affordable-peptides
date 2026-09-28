import assert from "node:assert/strict";
import test from "node:test";

import type { PayRamPaymentStatus } from "../lib/payram/client";
import { BASE_NATIVE_USDC_ADDRESS } from "../lib/payram/constants";
import {
  decimalAmountsEqual,
  parsePayRamWebhookPayload,
  verifyPayRamPayment,
  type PayRamWebhookPayload,
} from "../lib/payram/verification";

const ATTEMPT_ID = "attempt-1";
const ORDER_ID = "order-1";
const REFERENCE_ID = "reference-1";
const DEPOSIT_ADDRESS = `0x${"1".repeat(40)}`;
const TRANSACTION_HASH = `0x${"a".repeat(64)}`;

function status(
  overrides: Partial<PayRamPaymentStatus> = {}
): PayRamPaymentStatus {
  return {
    invoiceId: ATTEMPT_ID,
    customerId: ORDER_ID,
    referenceId: REFERENCE_ID,
    amountInUsd: "100.00",
    paymentState: "FILLED",
    currencySymbol: "USDC",
    blockchainSymbol: "BASE",
    tokenAddress: BASE_NATIVE_USDC_ADDRESS,
    depositAddress: DEPOSIT_ADDRESS,
    filledAmount: "100",
    filledAmountInUsd: "100.00",
    explorerTransaction: `https://basescan.org/tx/${TRANSACTION_HASH}`,
    raw: {},
    ...overrides,
  };
}

function webhook(overrides: Partial<PayRamWebhookPayload> = {}) {
  return {
    customerId: ORDER_ID,
    invoiceId: ATTEMPT_ID,
    referenceId: REFERENCE_ID,
    status: "FILLED",
    amount: "100.00",
    currency: "USDC",
    filledAmount: "100.000000",
    filledAmountInUsd: "100.00",
    timestamp: 1_800_000_000,
    paymentInfo: [
      {
        sourceAddress: `0x${"2".repeat(40)}`,
        transactionHash: TRANSACTION_HASH,
        destinationAddress: DEPOSIT_ADDRESS,
        blockNumber: 123,
      },
    ],
    confirmationCurrent: 0,
    confirmationRequired: 0,
    raw: {},
    ...overrides,
  } satisfies PayRamWebhookPayload;
}

function verify(
  statusOverrides: Partial<PayRamPaymentStatus> = {},
  webhookOverrides: Partial<PayRamWebhookPayload> = {}
) {
  return verifyPayRamPayment({
    attemptId: ATTEMPT_ID,
    orderId: ORDER_ID,
    providerReference: REFERENCE_ID,
    invoiceAmount: "100.00",
    settlementAsset: "USDC",
    settlementNetwork: "BASE",
    expectedTokenAddress: BASE_NATIVE_USDC_ADDRESS,
    status: status(statusOverrides),
    webhook: webhook(webhookOverrides),
  });
}

test("accepts only a full authenticated Base USDC settlement", () => {
  const decision = verify();
  assert.equal(decision.shouldPay, true);
  assert.equal(decision.attemptStatus, "FILLED");
  assert.equal(decision.reviewReason, null);
  assert.deepEqual(decision.transactionHashes, [
    TRANSACTION_HASH.toLowerCase(),
  ]);
});

test("uses rechecked provider status instead of an out-of-order webhook status", () => {
  const decision = verify({}, { status: "OPEN", confirmationCurrent: 1 });
  assert.equal(decision.shouldPay, true);
  assert.equal(decision.providerStatus, "FILLED");
});

test("keeps partial payments pending", () => {
  const decision = verify(
    {
      paymentState: "PARTIALLY_FILLED",
      filledAmount: "40",
      filledAmountInUsd: "40",
    },
    {
      status: "PARTIALLY_FILLED",
      filledAmount: "40",
      filledAmountInUsd: "40",
    }
  );
  assert.equal(decision.shouldPay, false);
  assert.equal(decision.attemptStatus, "PARTIALLY_FILLED");
  assert.equal(decision.reviewReason, null);
});

test("routes overpayments and mismatches to review", () => {
  assert.equal(
    verify({ paymentState: "OVER_FILLED" }).reviewReason,
    "EXCESS_PAYMENT"
  );
  assert.equal(
    verify({ amountInUsd: "99.99" }).reviewReason,
    "INVOICE_AMOUNT_MISMATCH"
  );
  assert.equal(
    verify({ currencySymbol: "USDT" }).reviewReason,
    "SETTLEMENT_ASSET_MISMATCH"
  );
  assert.equal(
    verify({ blockchainSymbol: "ETH" }).reviewReason,
    "SETTLEMENT_NETWORK_MISMATCH"
  );
  assert.equal(
    verify({ tokenAddress: `0x${"3".repeat(40)}` }).reviewReason,
    "USDC_TOKEN_MISMATCH"
  );
  assert.equal(
    verify({ depositAddress: `0x${"4".repeat(40)}` }).reviewReason,
    "RECEIVING_ADDRESS_MISMATCH"
  );
});

test("requires a deposit transaction before releasing fulfillment", () => {
  const decision = verify(
    { explorerTransaction: null },
    { paymentInfo: [] }
  );
  assert.equal(decision.shouldPay, false);
  assert.equal(decision.reviewReason, "MISSING_DEPOSIT_TRANSACTION");
});

test("parses string-valued PayRam webhook amounts without floating point loss", () => {
  const parsed = parsePayRamWebhookPayload({
    reference_id: REFERENCE_ID,
    invoice_id: ATTEMPT_ID,
    customer_id: ORDER_ID,
    status: "FILLED",
    amount: "100.00",
    filled_amount: "100.000000",
    currency: "USDC",
    timestamp: 1_800_000_000,
    payment_info: [
      {
        transaction_hash: TRANSACTION_HASH,
        destination_address: DEPOSIT_ADDRESS,
        block_number: 123,
      },
    ],
  });

  assert.equal(parsed.amount, "100.00");
  assert.equal(parsed.paymentInfo[0]?.transactionHash, TRANSACTION_HASH);
  assert.equal(decimalAmountsEqual("100", "100.000000"), true);
  assert.equal(decimalAmountsEqual("100.000001", "100"), false);
  assert.equal(decimalAmountsEqual("not-a-number", "100"), false);
});
