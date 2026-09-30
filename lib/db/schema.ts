import
{
  pgTable,
  text,
  jsonb,
  timestamp,
  varchar,
  numeric,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { OrderStatus } from "../orders";
import type { CartItem } from "@/components/store/StorefrontContext";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"), // For credentials provider
  role: varchar("role", { length: 20 }).notNull().default("CUSTOMER"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => ({
  compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => ({
  compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
}));

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex(
      "password_reset_tokens_token_hash_unique"
    ).on(table.tokenHash),
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
    expiresIdx: index("password_reset_tokens_expires_idx").on(table.expiresAt),
  })
);

export const customerProfiles = pgTable("customer_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  phone: text("phone"),
  shippingStreet: text("shipping_street"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZipCode: text("shipping_zip_code"),
  shippingCountry: text("shipping_country"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const referralPartners = pgTable(
  "referral_partners",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    commissionPercent: numeric("commission_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    defaultDiscountType: varchar("default_discount_type", { length: 10 })
      .notNull()
      .default("percent"),
    defaultDiscountValue: numeric("default_discount_value", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    contactEmailIdx: uniqueIndex("referral_partners_contact_email_idx").on(
      table.contactEmail
    ),
  })
);

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => referralPartners.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    description: text("description"),
    discountType: varchar("discount_type", { length: 10 })
      .notNull()
      .default("percent"),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    minOrderSubtotal: numeric("min_order_subtotal", {
      precision: 10,
      scale: 2,
    }),
    maxRedemptionsPerCustomer: integer(
      "max_redemptions_per_customer"
    )
      .notNull()
      .default(1),
    maxTotalRedemptions: integer("max_total_redemptions"),
    currentRedemptions: integer("current_redemptions")
      .notNull()
      .default(0),
    startsAt: timestamp("starts_at"),
    expiresAt: timestamp("expires_at"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeUnique: uniqueIndex("referral_codes_code_unique").on(table.code),
    partnerIdx: index("referral_codes_partner_idx").on(table.partnerId),
  })
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().$type<OrderStatus>(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    paymentMethod: varchar("payment_method", { length: 32 })
      .notNull()
      .default("manual"),
    idempotencyKey: text("idempotency_key"),
    guestAccessTokenHash: text("guest_access_token_hash"),
    inventoryReservationStatus: varchar("inventory_reservation_status", {
      length: 20,
    })
      .notNull()
      .default("RESERVED"),
    inventoryReleasedAt: timestamp("inventory_released_at"),
    paidAt: timestamp("paid_at"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull(),
    shippingAddress: jsonb("shipping_address").notNull().$type<{
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    }>(),
    items: jsonb("items").notNull().$type<CartItem[]>(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
    totalUnits: integer("total_units").notNull(),
    notes: text("notes"),
    trackingNumber: text("tracking_number"),
    trackingCarrier: varchar("tracking_carrier", { length: 10 }),
    referralPartnerId: text("referral_partner_id").references(
      () => referralPartners.id,
      {
        onDelete: "set null",
      }
    ),
    referralPartnerName: text("referral_partner_name"),
    referralCodeId: text("referral_code_id").references(() => referralCodes.id, {
      onDelete: "set null",
    }),
    referralCodeValue: text("referral_code_value"),
    referralAttributionId: text("referral_attribution_id"),
    referralDiscount: numeric("referral_discount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    referralCommissionPercent: numeric("referral_commission_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    referralCommissionAmount: numeric("referral_commission_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    orderReceiptEmailId: text("order_receipt_email_id"),
    orderReceiptEmailStatus: text("order_receipt_email_status"),
    orderReceiptEmailUpdatedAt: timestamp("order_receipt_email_updated_at"),
    orderPaidEmailId: text("order_paid_email_id"),
    orderPaidEmailStatus: text("order_paid_email_status"),
    orderPaidEmailUpdatedAt: timestamp("order_paid_email_updated_at"),
    orderShippedEmailId: text("order_shipped_email_id"),
    orderShippedEmailStatus: text("order_shipped_email_status"),
    orderShippedEmailUpdatedAt: timestamp("order_shipped_email_updated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idempotencyKeyUnique: uniqueIndex("orders_idempotency_key_unique").on(
      table.idempotencyKey
    ),
    guestAccessTokenHashIdx: index("orders_guest_access_token_hash_idx").on(
      table.guestAccessTokenHash
    ),
  })
);

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerReference: text("provider_reference"),
    invoiceId: text("invoice_id").notNull(),
    invoiceAmount: numeric("invoice_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    settlementAsset: varchar("settlement_asset", { length: 16 }).notNull(),
    settlementNetwork: varchar("settlement_network", { length: 32 }).notNull(),
    tokenAddress: text("token_address"),
    status: varchar("status", { length: 40 }).notNull(),
    providerStatus: varchar("provider_status", { length: 40 }),
    paymentUrl: text("payment_url"),
    receivingAddress: text("receiving_address"),
    filledAmount: numeric("filled_amount", { precision: 36, scale: 18 }),
    filledAmountUsd: numeric("filled_amount_usd", {
      precision: 12,
      scale: 2,
    }),
    depositTransactionHashes: jsonb("deposit_transaction_hashes")
      .notNull()
      .$type<string[]>()
      .default([]),
    confirmationCurrent: integer("confirmation_current").notNull().default(0),
    confirmationRequired: integer("confirmation_required").notNull().default(0),
    reviewReason: text("review_reason"),
    reconciliationError: text("reconciliation_error"),
    expiresAt: timestamp("expires_at"),
    lastProviderEventAt: timestamp("last_provider_event_at"),
    lastReconciledAt: timestamp("last_reconciled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerReferenceUnique: uniqueIndex(
      "payment_attempts_provider_reference_unique"
    ).on(table.provider, table.providerReference),
    invoiceIdUnique: uniqueIndex("payment_attempts_invoice_id_unique").on(
      table.invoiceId
    ),
    orderIdx: index("payment_attempts_order_idx").on(table.orderId),
    statusUpdatedIdx: index("payment_attempts_status_updated_idx").on(
      table.status,
      table.updatedAt
    ),
  })
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    provider: varchar("provider", { length: 32 }).notNull(),
    paymentAttemptId: text("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "set null" }
    ),
    providerReference: text("provider_reference"),
    invoiceId: text("invoice_id"),
    providerStatus: varchar("provider_status", { length: 40 }),
    rawBodyHash: text("raw_body_hash").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    processingStatus: varchar("processing_status", { length: 24 })
      .notNull()
      .default("RECEIVED"),
    processingResult: text("processing_result"),
    processingError: text("processing_error"),
    providerTimestamp: timestamp("provider_timestamp"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (table) => ({
    rawBodyHashUnique: uniqueIndex("payment_events_raw_body_hash_unique").on(
      table.provider,
      table.rawBodyHash
    ),
    attemptIdx: index("payment_events_attempt_idx").on(table.paymentAttemptId),
  })
);

export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    paymentAttemptId: text("payment_attempt_id").references(
      () => paymentAttempts.id,
      { onDelete: "restrict" }
    ),
    approvedByUserId: text("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    recipientAddress: text("recipient_address").notNull(),
    recipientVerifiedAt: timestamp("recipient_verified_at").notNull(),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    asset: varchar("asset", { length: 16 }).notNull(),
    network: varchar("network", { length: 32 }).notNull(),
    status: varchar("status", { length: 24 }).notNull(),
    transactionHash: text("transaction_hash"),
    notes: text("notes"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    transactionHashUnique: uniqueIndex(
      "payment_refunds_transaction_hash_unique"
    ).on(table.transactionHash),
    orderIdx: index("payment_refunds_order_idx").on(table.orderId),
  })
);

export const treasurySweeps = pgTable(
  "treasury_sweeps",
  {
    id: text("id").primaryKey(),
    paymentAttemptId: text("payment_attempt_id")
      .notNull()
      .references(() => paymentAttempts.id, { onDelete: "restrict" }),
    depositTransactionHash: text("deposit_transaction_hash").notNull(),
    sweepTransactionHash: text("sweep_transaction_hash").notNull(),
    destinationAddress: text("destination_address").notNull(),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    asset: varchar("asset", { length: 16 }).notNull(),
    network: varchar("network", { length: 32 }).notNull(),
    status: varchar("status", { length: 24 }).notNull(),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    sweepTransactionHashUnique: uniqueIndex(
      "treasury_sweeps_transaction_hash_unique"
    ).on(table.sweepTransactionHash),
    attemptIdx: index("treasury_sweeps_attempt_idx").on(table.paymentAttemptId),
  })
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    eventType: varchar("event_type", { length: 40 }).notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    status: varchar("status", { length: 24 }).notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
    lockedUntil: timestamp("locked_until"),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    orderEventUnique: uniqueIndex("email_outbox_order_event_unique").on(
      table.orderId,
      table.eventType
    ),
    pendingIdx: index("email_outbox_pending_idx").on(
      table.status,
      table.nextAttemptAt
    ),
  })
);

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => referralPartners.id, { onDelete: "cascade" }),
    codeId: text("code_id").references(() => referralCodes.id, {
      onDelete: "set null",
    }),
    customerEmail: text("customer_email").notNull(),
    customerUserId: text("customer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name"),
    firstOrderId: text("first_order_id"),
    firstOrderNumber: varchar("first_order_number", { length: 50 }),
    firstOrderDiscount: numeric("first_order_discount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lifetimeRevenue: numeric("lifetime_revenue", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    lifetimeCommission: numeric("lifetime_commission", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalOrders: integer("total_orders").notNull().default(0),
    lastOrderId: text("last_order_id"),
    lastOrderNumber: varchar("last_order_number", { length: 50 }),
    lastOrderAt: timestamp("last_order_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    partnerIdx: index("referral_attributions_partner_idx").on(table.partnerId),
    customerEmailUnique: uniqueIndex(
      "referral_attributions_customer_email_unique"
    ).on(table.customerEmail),
  })
);

export const productInventory = pgTable(
  "product_inventory",
  {
    id: text("id").primaryKey(),
    productSlug: text("product_slug").notNull(),
    variantLabel: text("variant_label").notNull(),
    stock: integer("stock").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    productVariantKey: uniqueIndex(
      "product_inventory_product_variant_idx"
    ).on(table.productSlug, table.variantLabel),
  })
);

