import { eq, and, or, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";
import
  {
    db as drizzleDb,
    orders,
    customerProfiles,
    productInventory,
  } from "./db/index";
import type { Order, OrderStatus } from "./orders";

export const db = drizzleDb;

export type OrderEmailChannel = "receipt" | "paid" | "shipped";
export type OrderContactExportStatus = Extract<
  OrderStatus,
  "PENDING_PAYMENT" | "SHIPPED"
>;

export type OrderContactExportRecord = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  lastOrderId: string;
  lastOrderNumber: string;
  lastOrderStatus: OrderContactExportStatus;
  lastOrderCreatedAt: string;
  lastOrderUpdatedAt: string;
};

// Convert database row to Order type
function dbRowToOrder (row: typeof orders.$inferSelect): Order
{
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    userId: row.userId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    shippingAddress: row.shippingAddress,
    items: row.items,
    subtotal: parseFloat(row.subtotal),
    shippingCost:
      row.shippingCost === null ? undefined : parseFloat(row.shippingCost),
    totalAmount:
      row.totalAmount === null ? undefined : parseFloat(row.totalAmount),
    paymentMethod: row.paymentMethod,
    paymentTransactionId: row.paymentTransactionId || undefined,
    paidAt: row.paidAt ? row.paidAt.toISOString() : undefined,
    totalUnits: row.totalUnits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes || undefined,
    trackingNumber: row.trackingNumber || undefined,
    trackingCarrier: (row.trackingCarrier as "UPS" | "USPS" | null) || undefined,
    referralPartnerId: row.referralPartnerId || undefined,
    referralPartnerName: row.referralPartnerName || undefined,
    referralCodeId: row.referralCodeId || undefined,
    referralCode: row.referralCodeValue || undefined,
    referralAttributionId: row.referralAttributionId || undefined,
    referralDiscount: row.referralDiscount
      ? parseFloat(row.referralDiscount)
      : 0,
    referralCommissionPercent: row.referralCommissionPercent
      ? parseFloat(row.referralCommissionPercent)
      : 0,
    referralCommissionAmount: row.referralCommissionAmount
      ? parseFloat(row.referralCommissionAmount)
      : 0,
    orderReceiptEmailId: row.orderReceiptEmailId || undefined,
    orderReceiptEmailStatus: row.orderReceiptEmailStatus || undefined,
    orderReceiptEmailUpdatedAt: row.orderReceiptEmailUpdatedAt
      ? row.orderReceiptEmailUpdatedAt.toISOString()
      : undefined,
    orderPaidEmailId: row.orderPaidEmailId || undefined,
    orderPaidEmailStatus: row.orderPaidEmailStatus || undefined,
    orderPaidEmailUpdatedAt: row.orderPaidEmailUpdatedAt
      ? row.orderPaidEmailUpdatedAt.toISOString()
      : undefined,
    orderShippedEmailId: row.orderShippedEmailId || undefined,
    orderShippedEmailStatus: row.orderShippedEmailStatus || undefined,
    orderShippedEmailUpdatedAt: row.orderShippedEmailUpdatedAt
      ? row.orderShippedEmailUpdatedAt.toISOString()
      : undefined,
  };
}

// Convert Order type to database row
function orderToDbRow (order: Order): typeof orders.$inferInsert
{
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    userId: order.userId ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: order.shippingAddress,
    items: order.items,
    subtotal: order.subtotal.toString(),
    shippingCost:
      typeof order.shippingCost === "number"
        ? order.shippingCost.toString()
        : null,
    totalAmount:
      typeof order.totalAmount === "number"
        ? order.totalAmount.toString()
        : null,
    paymentMethod: order.paymentMethod ?? "MANUAL",
    paymentTransactionId: order.paymentTransactionId ?? null,
    paidAt: order.paidAt ? new Date(order.paidAt) : null,
    totalUnits: order.totalUnits,
    notes: order.notes || null,
    trackingNumber: order.trackingNumber || null,
    trackingCarrier: order.trackingCarrier || null,
    referralPartnerId: order.referralPartnerId ?? null,
    referralPartnerName: order.referralPartnerName ?? null,
    referralCodeId: order.referralCodeId ?? null,
    referralCodeValue: order.referralCode ?? null,
    referralAttributionId: order.referralAttributionId ?? null,
    referralDiscount: (order.referralDiscount ?? 0).toString(),
    referralCommissionPercent: (order.referralCommissionPercent ?? 0).toString(),
    referralCommissionAmount: (order.referralCommissionAmount ?? 0).toString(),
    orderReceiptEmailId: order.orderReceiptEmailId ?? null,
    orderReceiptEmailStatus: order.orderReceiptEmailStatus ?? null,
    orderReceiptEmailUpdatedAt: order.orderReceiptEmailUpdatedAt
      ? new Date(order.orderReceiptEmailUpdatedAt)
      : null,
    orderPaidEmailId: order.orderPaidEmailId ?? null,
    orderPaidEmailStatus: order.orderPaidEmailStatus ?? null,
    orderPaidEmailUpdatedAt: order.orderPaidEmailUpdatedAt
      ? new Date(order.orderPaidEmailUpdatedAt)
      : null,
    orderShippedEmailId: order.orderShippedEmailId ?? null,
    orderShippedEmailStatus: order.orderShippedEmailStatus ?? null,
    orderShippedEmailUpdatedAt: order.orderShippedEmailUpdatedAt
      ? new Date(order.orderShippedEmailUpdatedAt)
      : null,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
  };
}

export async function createOrder (order: Order): Promise<Order>
{
  const dbRow = orderToDbRow(order);
  const [inserted] = await db.insert(orders).values(dbRow).returning();
  return dbRowToOrder(inserted);
}

export async function getOrderById (id: string): Promise<Order | null>
{
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  return order ? dbRowToOrder(order) : null;
}

export async function getOrderByOrderNumber (
  orderNumber: string
): Promise<Order | null>
{
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  return order ? dbRowToOrder(order) : null;
}

export async function getAllOrders (searchQuery?: string): Promise<Order[]>
{
  if (searchQuery && searchQuery.trim()) {
    const query = `%${searchQuery.trim()}%`;
    const allOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          ilike(orders.orderNumber, query),
          ilike(orders.customerName, query),
          ilike(orders.customerEmail, query),
          ilike(orders.customerPhone, query)
        )
      );
    return allOrders.map(dbRowToOrder);
  }

  const allOrders = await db.select().from(orders);
  return allOrders.map(dbRowToOrder);
}

export async function getOrderContactsByStatus (
  status: OrderContactExportStatus
): Promise<OrderContactExportRecord[]>
{
  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(eq(orders.status, status));

  const dedupedByEmail = new Map<
    string,
    {
      id: string;
      orderNumber: string;
      status: OrderContactExportStatus;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
      createdAt: Date;
      updatedAt: Date;
    }
  >();

  rows.forEach((row) =>
  {
    const emailKey = row.customerEmail.trim().toLowerCase();
    if (!emailKey) {
      return;
    }

    const existing = dedupedByEmail.get(emailKey);
    if (!existing || row.updatedAt.getTime() > existing.updatedAt.getTime()) {
      dedupedByEmail.set(emailKey, {
        ...row,
        status: row.status as OrderContactExportStatus,
      });
    }
  });

  return Array.from(dedupedByEmail.values())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((row) => ({
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      shippingStreet: row.shippingAddress?.street ?? "",
      shippingCity: row.shippingAddress?.city ?? "",
      shippingState: row.shippingAddress?.state ?? "",
      shippingZipCode: row.shippingAddress?.zipCode ?? "",
      shippingCountry: row.shippingAddress?.country ?? "",
      lastOrderId: row.id,
      lastOrderNumber: row.orderNumber,
      lastOrderStatus: row.status,
      lastOrderCreatedAt: row.createdAt.toISOString(),
      lastOrderUpdatedAt: row.updatedAt.toISOString(),
    }));
}

export async function updateOrderStatus (
  id: string,
  status: Order["status"],
  notes?: string,
  trackingNumber?: string,
  trackingCarrier?: "UPS" | "USPS"
): Promise<Order | null>
{
  const [updated] = await db
    .update(orders)
    .set({
      status,
      notes: notes || null,
      trackingNumber: trackingNumber || null,
      trackingCarrier: trackingCarrier || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  return updated ? dbRowToOrder(updated) : null;
}

export async function setOrderCommunicationSent (
  orderId: string,
  channel: OrderEmailChannel,
  emailId: string
): Promise<Order | null>
{
  const baseSet = { updatedAt: new Date() };
  const timestamp = new Date();
  const setValues =
    channel === "receipt"
      ? {
        ...baseSet,
        orderReceiptEmailId: emailId,
        orderReceiptEmailStatus: "email.sent",
        orderReceiptEmailUpdatedAt: timestamp,
      }
      : channel === "paid"
        ? {
          ...baseSet,
          orderPaidEmailId: emailId,
          orderPaidEmailStatus: "email.sent",
          orderPaidEmailUpdatedAt: timestamp,
        }
        : {
          ...baseSet,
          orderShippedEmailId: emailId,
          orderShippedEmailStatus: "email.sent",
          orderShippedEmailUpdatedAt: timestamp,
        };

  const [updated] = await db
    .update(orders)
    .set(setValues)
    .where(eq(orders.id, orderId))
    .returning();

  return updated ? dbRowToOrder(updated) : null;
}

export async function applyOrderCommunicationEvent (
  resendEmailId: string,
  eventType: string,
  eventAt?: Date
): Promise<Order | null>
{
  const timestamp = eventAt ?? new Date();
  const [matchedOrder] = await db
    .select()
    .from(orders)
    .where(
      or(
        eq(orders.orderReceiptEmailId, resendEmailId),
        eq(orders.orderPaidEmailId, resendEmailId),
        eq(orders.orderShippedEmailId, resendEmailId)
      )
    )
    .limit(1);

  if (!matchedOrder) {
    return null;
  }

  const updatePayload: Partial<typeof orders.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (matchedOrder.orderReceiptEmailId === resendEmailId) {
    updatePayload.orderReceiptEmailStatus = eventType;
    updatePayload.orderReceiptEmailUpdatedAt = timestamp;
  } else if (matchedOrder.orderPaidEmailId === resendEmailId) {
    updatePayload.orderPaidEmailStatus = eventType;
    updatePayload.orderPaidEmailUpdatedAt = timestamp;
  } else if (matchedOrder.orderShippedEmailId === resendEmailId) {
    updatePayload.orderShippedEmailStatus = eventType;
    updatePayload.orderShippedEmailUpdatedAt = timestamp;
  } else {
    return null;
  }

  const [updated] = await db
    .update(orders)
    .set(updatePayload)
    .where(eq(orders.id, matchedOrder.id))
    .returning();

  return updated ? dbRowToOrder(updated) : null;
}

export async function getOrdersForUser (userId: string): Promise<Order[]>
{
  if (!userId) {
    return [];
  }

  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId));

  return rows.map(dbRowToOrder);
}

export type CustomerProfile = {
  userId: string;
  fullName: string | null;
  phone: string | null;
  shippingStreet: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZipCode: string | null;
  shippingCountry: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerProfileUpdate = Partial<
  Pick<
    CustomerProfile,
    | "fullName"
    | "phone"
    | "shippingStreet"
    | "shippingCity"
    | "shippingState"
    | "shippingZipCode"
    | "shippingCountry"
  >
>;

function dbRowToCustomerProfile (
  row: typeof customerProfiles.$inferSelect
): CustomerProfile
{
  return {
    userId: row.userId,
    fullName: row.fullName ?? null,
    phone: row.phone ?? null,
    shippingStreet: row.shippingStreet ?? null,
    shippingCity: row.shippingCity ?? null,
    shippingState: row.shippingState ?? null,
    shippingZipCode: row.shippingZipCode ?? null,
    shippingCountry: row.shippingCountry ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCustomerProfile (
  userId: string
): Promise<CustomerProfile | null>
{
  if (!userId) {
    return null;
  }

  const [row] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .limit(1);

  return row ? dbRowToCustomerProfile(row) : null;
}

export async function upsertCustomerProfile (
  userId: string,
  profile: CustomerProfileUpdate
): Promise<CustomerProfile>
{
  const existing = await getCustomerProfile(userId);
  const data = {
    fullName: profile.fullName ?? null,
    phone: profile.phone ?? null,
    shippingStreet: profile.shippingStreet ?? null,
    shippingCity: profile.shippingCity ?? null,
    shippingState: profile.shippingState ?? null,
    shippingZipCode: profile.shippingZipCode ?? null,
    shippingCountry: profile.shippingCountry ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(customerProfiles)
      .set(data)
      .where(eq(customerProfiles.userId, userId))
      .returning();
    return dbRowToCustomerProfile(updated);
  }

  const [created] = await db
    .insert(customerProfiles)
    .values({
      userId,
      ...data,
      createdAt: new Date(),
    })
    .returning();

  return dbRowToCustomerProfile(created);
}

export type ProductInventoryRecord = {
  id: string;
  productSlug: string;
  variantLabel: string;
  stock: number;
  updatedAt: string;
};

function dbRowToProductInventory (
  row: typeof productInventory.$inferSelect
): ProductInventoryRecord
{
  return {
    id: row.id,
    productSlug: row.productSlug,
    variantLabel: row.variantLabel,
    stock: row.stock,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAllProductInventory (): Promise<ProductInventoryRecord[]>
{
  const rows = await db.select().from(productInventory);
  return rows.map(dbRowToProductInventory);
}

export async function getProductInventoryRecord (
  productSlug: string,
  variantLabel: string
): Promise<ProductInventoryRecord | null>
{
  const [row] = await db
    .select()
    .from(productInventory)
    .where(
      and(
        eq(productInventory.productSlug, productSlug),
        eq(productInventory.variantLabel, variantLabel)
      )
    )
    .limit(1);

  return row ? dbRowToProductInventory(row) : null;
}

export async function setProductStock (
  productSlug: string,
  variantLabel: string,
  stock: number
): Promise<ProductInventoryRecord>
{
  const normalizedStock = Math.max(0, Math.trunc(stock));
  const now = new Date();

  const [row] = await db
    .insert(productInventory)
    .values({
      id: randomUUID(),
      productSlug,
      variantLabel,
      stock: normalizedStock,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        productInventory.productSlug,
        productInventory.variantLabel,
      ],
      set: {
        stock: normalizedStock,
        updatedAt: now,
      },
    })
    .returning();

  return dbRowToProductInventory(row);
}

export async function deleteOrder (id: string): Promise<boolean>
{
  const result = await db.delete(orders).where(eq(orders.id, id)).returning();
  return result.length > 0;
}
