import { auth } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders";

const statusStyles: Record<string, string> = {
  PENDING_PAYMENT: "text-yellow-200 bg-yellow-500/10",
  PAID: "text-blue-200 bg-blue-500/10",
  SHIPPED: "text-green-200 bg-green-500/10",
  CANCELLED: "text-red-200 bg-red-500/10",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export default async function AccountOrdersPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const orders = await getOrdersForUser(session.user.id);
  const sorted = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <section className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
          Order History
        </p>
        <h1 className="text-3xl font-semibold text-white">Your Orders</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Need help? Reference your order number when contacting support.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-purple-900/40 bg-black/40 p-8 text-center">
          <p className="text-sm text-zinc-400">
            No orders yet. Once you place an order, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-purple-900/40 bg-black/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Order {formatOrderNumber(order.orderNumber)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    statusStyles[order.status] ?? "bg-purple-500/10 text-purple-200"
                  }`}
                >
                  {order.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Shipping To
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {order.customerName}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {order.shippingAddress.street}, {order.shippingAddress.city},{" "}
                    {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {formatCurrency(order.subtotal)}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {order.totalUnits} unit{order.totalUnits === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-purple-900/30 bg-black/30 p-4 text-sm text-zinc-300">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                  Items
                </p>
                <ul className="space-y-1">
                  {order.items.map((item, index) => (
                    <li key={`${order.id}-${index}`}>
                      {item.productName} ({item.variantLabel}) — {item.count}× Qty{" "}
                      {item.tierQuantity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

