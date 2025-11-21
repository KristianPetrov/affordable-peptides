import { eq } from "drizzle-orm";
import { db as drizzleDb, orders, customerProfiles } from "./db/index";
import type { Order } from "./orders";

export const db = drizzleDb;

// Convert database row to Order type
function dbRowToOrder(row: typeof orders.$inferSelect): Order {
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
    totalUnits: row.totalUnits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes || undefined,
  };
}

// Convert Order type to database row
function orderToDbRow(order: Order): typeof orders.$inferInsert {
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
    totalUnits: order.totalUnits,
    notes: order.notes || null,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
  };
}

export async function createOrder(order: Order): Promise<Order> {
  const dbRow = orderToDbRow(order);
  const [inserted] = await db.insert(orders).values(dbRow).returning();
  return dbRowToOrder(inserted);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  return order ? dbRowToOrder(order) : null;
}

export async function getOrderByOrderNumber(
  orderNumber: string
): Promise<Order | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  return order ? dbRowToOrder(order) : null;
}

export async function getAllOrders(): Promise<Order[]> {
  const allOrders = await db.select().from(orders);
  return allOrders.map(dbRowToOrder);
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"],
  notes?: string
): Promise<Order | null> {
  const [updated] = await db
    .update(orders)
    .set({
      status,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, id))
    .returning();

  return updated ? dbRowToOrder(updated) : null;
}

export async function getOrdersForUser(userId: string): Promise<Order[]> {
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

function dbRowToCustomerProfile(
  row: typeof customerProfiles.$inferSelect
): CustomerProfile {
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

export async function getCustomerProfile(
  userId: string
): Promise<CustomerProfile | null> {
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

export async function upsertCustomerProfile(
  userId: string,
  profile: CustomerProfileUpdate
): Promise<CustomerProfile> {
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
