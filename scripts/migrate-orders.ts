import { readFile } from "fs/promises";
import { join } from "path";
import { createOrder, getOrderByOrderNumber } from "@/lib/db";
import type { Order } from "@/lib/orders";

const ORDERS_FILE = join(process.cwd(), "data", "orders.json");

async function migrateOrders() {
  try {
    console.log("Reading orders from data/orders.json...");
    const ordersData = await readFile(ORDERS_FILE, "utf-8");
    const orders: Order[] = JSON.parse(ordersData);

    if (orders.length === 0) {
      console.log("No orders to migrate.");
      return;
    }

    console.log(`Found ${orders.length} order(s) to migrate.`);

    let successCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        // Check if order already exists (by order number)
        const existing = await getOrderByOrderNumber(order.orderNumber);
        if (existing) {
          console.log(`⚠ Order ${order.orderNumber} already exists, skipping...`);
          continue;
        }

        await createOrder(order);
        console.log(`✓ Migrated order ${order.orderNumber}`);
        successCount++;
      } catch (error: any) {
        console.error(`✗ Failed to migrate order ${order.orderNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log("\nMigration complete!");
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("No orders.json file found. Nothing to migrate.");
    } else {
      console.error("Error during migration:", error);
      process.exit(1);
    }
  }
}

// Run migration
migrateOrders()
  .then(() => {
    console.log("Migration script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

