import Link from "next/link";
import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import { getAllOrders } from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders";
import {
  updateProductStockAction,
} from "@/app/actions/admin";
import { auth, signOut } from "@/lib/auth";
import { calculateVolumePricing } from "@/lib/cart-pricing";
import { getProductsWithInventory } from "@/lib/products.server";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/admin/login" });
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:border-red-400 hover:text-white"
      >
        Sign Out
      </button>
    </form>
  );
}

type AdminPageProps = {
  searchParams?: Promise<{ view?: string; search?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  const params = searchParams ? await searchParams : undefined;
  const activeView =
    params?.view === "inventory" ? "inventory" : "orders";
  const searchQuery = params?.search || "";

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  const [orders, productsWithInventory] = await Promise.all([
    getAllOrders(searchQuery),
    getProductsWithInventory(),
  ]);
  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const statusCounts = {
    PENDING_PAYMENT: orders.filter((o) => o.status === "PENDING_PAYMENT")
      .length,
    PAID: orders.filter((o) => o.status === "PAID").length,
    SHIPPED: orders.filter((o) => o.status === "SHIPPED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                Admin Console
              </h1>
              <p className="mt-2 text-zinc-400">
                Manage orders, payments, and product inventory in one view.
              </p>
              {session.user && (
                <p className="mt-1 text-xs text-zinc-500">
                  Logged in as {session.user.email}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 sm:flex-nowrap">
              <Link
                href="/store"
                className="rounded-full border border-purple-500/60 bg-purple-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
              >
                View Store
              </Link>
              <SignOutButton />
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Admin sections"
            className="mb-8 flex flex-wrap gap-3"
          >
            {[
              { id: "orders", label: "Orders", href: "/admin" },
              {
                id: "inventory",
                label: "Inventory",
                href: "/admin?view=inventory",
              },
            ].map((tab) => {
              const isActive = activeView === tab.id;
              return (
                <Link
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  href={tab.href}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isActive
                      ? "border-purple-400 bg-purple-500/30 text-white shadow-[0_0_30px_rgba(120,48,255,0.35)]"
                      : "border-purple-900/50 bg-black/60 text-purple-200 hover:border-purple-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {activeView === "inventory" && (
            <section className="mb-10 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
            <div className="flex flex-col gap-2 pb-4 border-b border-purple-900/40">
              <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                Inventory Management
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Update Product Stock
              </h2>
              <p className="text-sm text-zinc-400">
                Enter the total number of research units currently on hand for
                each variant. Setting a value to 0 marks it as out of stock in
                the storefront.
              </p>
            </div>
            <div className="mt-6 space-y-6">
              {productsWithInventory.map((product) => (
                <div
                  key={product.slug}
                  className="rounded-2xl border border-purple-900/40 bg-black/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/30 pb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {product.name}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {product.variants.length} tracked variant
                        {product.variants.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Link
                      href={`/store/product/${product.slug}`}
                      className="rounded-full border border-purple-500/40 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-purple-200 transition hover:border-purple-300 hover:text-white"
                    >
                      View Product
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {product.variants.map((variant) => (
                      <form
                        key={`${product.slug}-${variant.label}`}
                        action={updateProductStockAction}
                        className="flex flex-col gap-3 rounded-xl border border-purple-900/30 bg-black/60 p-4"
                      >
                        <input
                          type="hidden"
                          name="productSlug"
                          value={product.slug}
                        />
                        <input
                          type="hidden"
                          name="variantLabel"
                          value={variant.label}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold uppercase tracking-wide text-purple-100">
                            {variant.label}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Current: {variant.stockQuantity ?? 0} unit
                            {variant.stockQuantity === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            type="number"
                            name="stock"
                            min={0}
                            step={1}
                            defaultValue={variant.stockQuantity ?? 0}
                            className="flex-1 rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <button
                            type="submit"
                            className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </section>
          )}

          {activeView === "orders" && (
            <>
          <div className="mb-6">
            <form method="get" action="/admin" className="flex gap-3">
              <input type="hidden" name="view" value="orders" />
              <input
                type="text"
                name="search"
                placeholder="Search by order number, name, email, or phone..."
                defaultValue={searchQuery}
                className="flex-1 rounded-lg border border-purple-900/40 bg-black/60 px-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                Search
              </button>
              {searchQuery && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-purple-900/40 bg-black/60 px-6 py-2 text-sm font-semibold text-white transition hover:bg-black/80"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
              <div className="text-sm text-zinc-400">Pending Payment</div>
              <div className="mt-2 text-3xl font-semibold text-yellow-400">
                {statusCounts.PENDING_PAYMENT}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
              <div className="text-sm text-zinc-400">Paid</div>
              <div className="mt-2 text-3xl font-semibold text-blue-400">
                {statusCounts.PAID}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
              <div className="text-sm text-zinc-400">Shipped</div>
              <div className="mt-2 text-3xl font-semibold text-green-400">
                {statusCounts.SHIPPED}
              </div>
            </div>
            <div className="rounded-2xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
              <div className="text-sm text-zinc-400">Total Orders</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {orders.length}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {sortedOrders.length === 0 ? (
              <div className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-12 text-center">
                <p className="text-zinc-400">
                  {searchQuery ? "No orders found matching your search" : "No orders yet"}
                </p>
              </div>
            ) : (
              sortedOrders.map((order) => {
                const pricing = calculateVolumePricing(order.items);
                const formattedOrderNumber = formatOrderNumber(order.orderNumber);
                const formattedDate = new Date(
                  order.createdAt
                ).toLocaleString("en-US", {
                  dateStyle: "short",
                  timeStyle: "short",
                });

                const statusColors = {
                  PENDING_PAYMENT: "bg-yellow-500/20 text-yellow-400",
                  PAID: "bg-blue-500/20 text-blue-400",
                  SHIPPED: "bg-green-500/20 text-green-400",
                  CANCELLED: "bg-red-500/20 text-red-400",
                };

                return (
                  <div
                    key={order.id}
                    className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6"
                  >
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div className="lg:col-span-2">
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              Order {formattedOrderNumber}
                            </h3>
                            <p className="mt-1 text-sm text-zinc-400">
                              {formattedDate}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                              statusColors[order.status]
                            }`}
                          >
                            {order.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="mb-4 space-y-2 text-sm">
                          <p>
                            <span className="text-zinc-400">Customer:</span>{" "}
                            <span className="text-white">{order.customerName}</span>
                          </p>
                          <p>
                            <span className="text-zinc-400">Email:</span>{" "}
                            <span className="text-white">{order.customerEmail}</span>
                          </p>
                          <p>
                            <span className="text-zinc-400">Phone:</span>{" "}
                            <span className="text-white">{order.customerPhone}</span>
                          </p>
                          <p>
                            <span className="text-zinc-400">Shipping:</span>{" "}
                            <span className="text-white">
                              {order.shippingAddress.street},{" "}
                              {order.shippingAddress.city},{" "}
                              {order.shippingAddress.state}{" "}
                              {order.shippingAddress.zipCode}
                            </span>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-purple-200">
                            Items:
                          </h4>
                          <ul className="space-y-1 text-sm text-zinc-300">
                            {order.items.map((item, idx) => (
                              <li key={idx}>
                                {item.productName} ({item.variantLabel}) -{" "}
                                {item.count}× Qty {item.tierQuantity} ={" "}
                                {formatCurrency(
                                  pricing.lineItemTotals[item.key] ??
                                    item.tierPrice * item.count
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-purple-900/40 bg-black/60 p-4">
                          <div className="mb-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-400">Subtotal:</span>
                              <span className="font-semibold text-white">
                                {formatCurrency(order.subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-zinc-400">Total Units:</span>
                              <span className="font-semibold text-white">
                                {order.totalUnits}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-purple-900/40 pt-4 space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                                Update Status
                              </label>
                              <OrderStatusForm
                                key={`${order.id}-${order.updatedAt}`}
                                orderId={order.id}
                                currentStatus={order.status}
                                currentTrackingNumber={order.trackingNumber}
                                currentTrackingCarrier={order.trackingCarrier}
                              />
                            </div>
                            <div className="border-t border-purple-900/40 pt-4">
                              <DeleteOrderButton
                                orderId={order.id}
                                orderNumber={formattedOrderNumber}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

