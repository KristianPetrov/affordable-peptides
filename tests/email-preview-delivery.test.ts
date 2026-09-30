import assert from "node:assert/strict";
import test from "node:test";
import type { Order } from "../lib/orders";

test("Vercel Preview suppresses every outbound email without logging customer details", async () => {
  const originalEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const messages: string[] = [];
  let outboundRequests = 0;

  // Placeholder only; no connection is made. neon() insists on a
  // user:password URL, so it is assembled from parts to keep secret scanners
  // from reading it as a real credential.
  const placeholderLogin = ["placeholder", "placeholder"].join(":");
  process.env.DATABASE_URL = `postgresql://${placeholderLogin}@db.invalid/test`;
  process.env.RESEND_API_KEY = "test-key";
  process.env.VERCEL_ENV = "preview";
  globalThis.fetch = async () => {
    outboundRequests += 1;
    throw new Error("Preview attempted an outbound request");
  };
  console.info = (...values: unknown[]) => messages.push(values.join(" "));
  console.log = (...values: unknown[]) => messages.push(values.join(" "));
  console.warn = (...values: unknown[]) => messages.push(values.join(" "));

  try {
    const {
      sendAdminPaymentReceivedEmail,
      sendOrderEmail,
      sendOrderPaidEmail,
      sendOrderShippedEmail,
      sendPasswordResetEmail,
      shouldSuppressEmailDelivery,
    } = await import("../lib/email");

    const order: Order = {
      id: "preview-order",
      orderNumber: "123456",
      status: "PENDING_PAYMENT",
      customerName: "Private Person",
      customerEmail: "private-person@example.invalid",
      customerPhone: "555-0100",
      shippingAddress: {
        street: "123 Private Street",
        city: "Example",
        state: "CA",
        zipCode: "90001",
        country: "US",
      },
      items: [],
      subtotal: 10,
      totalUnits: 0,
      createdAt: "2026-09-28T00:00:00.000Z",
      updatedAt: "2026-09-28T00:00:00.000Z",
    };

    await sendOrderEmail(order, { paymentMethod: "card_crypto" });
    await sendOrderPaidEmail(order);
    await sendAdminPaymentReceivedEmail(order);
    await sendOrderShippedEmail(order);
    await sendPasswordResetEmail(order.customerEmail, "private-reset-token");

    assert.equal(outboundRequests, 0);
    assert.equal(messages.length, 5);
    assert.ok(messages.every((message) => message.includes("Preview")));
    assert.doesNotMatch(messages.join("\n"), /Private Person|private-person|555-0100|123 Private Street|private-reset-token/);
    assert.equal(shouldSuppressEmailDelivery({ VERCEL_ENV: "preview" }), true);
    assert.equal(shouldSuppressEmailDelivery({ VERCEL_ENV: "production" }), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    console.log = originalLog;
    console.warn = originalWarn;
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
