import Link from "next/link";
import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import { getAllOrders } from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders";
import { updateOrderStatusAction } from "@/app/actions/admin";
import { auth, signOut } from "@/lib/auth";
import type { OrderStatus } from "@/lib/orders";
import { calculateVolumePricing } from "@/lib/cart-pricing";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const statusOptions: { value: OrderStatus; label: string }[] = [
    { value: "PENDING_PAYMENT", label: "Pending Payment" },
    { value: "PAID", label: "Paid" },
    { value: "SHIPPED", label: "Shipped" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  async function handleSubmit(formData: FormData) {
    "use server";
    const orderId = formData.get("orderId") as string;
    const status = formData.get("status") as OrderStatus;
    const notes = formData.get("notes") as string | null;

    await updateOrderStatusAction(orderId, status, notes || undefined);
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <textarea
        name="notes"
        placeholder="Optional notes..."
        className="w-full rounded-lg border border-purple-900/40 bg-black/60 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        rows={2}
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
      >
        Update Status
      </button>
    </form>
  );
}

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

export default async function AdminPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  const orders = await getAllOrders();
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
                Order Management
              </h1>
              <p className="mt-2 text-zinc-400">
                Manage orders and update their status
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
                <p className="text-zinc-400">No orders yet</p>
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

                          <div className="border-t border-purple-900/40 pt-4">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                              Update Status
                            </label>
                            <OrderStatusForm
                              orderId={order.id}
                              currentStatus={order.status}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

