import Link from "next/link";

import { auth } from "@/lib/auth";
import {
  getCustomerProfile,
  getOrdersForUser,
  type CustomerProfile,
} from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

function ProfileSummary({ profile }: { profile: CustomerProfile | null }) {
  if (!profile) {
    return (
      <p className="text-sm text-zinc-400">
        You haven&apos;t saved any customer information yet.{" "}
        <Link
          href="/account/profile"
          className="text-purple-200 underline decoration-dotted underline-offset-4 hover:text-purple-100"
        >
          Add your details
        </Link>{" "}
        to speed up checkout.
      </p>
    );
  }

  return (
    <dl className="space-y-2 text-sm text-zinc-300">
      <div>
        <dt className="text-zinc-500">Name</dt>
        <dd className="text-white">{profile.fullName ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Phone</dt>
        <dd className="text-white">{profile.phone ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Shipping</dt>
        <dd className="text-white">
          {[profile.shippingStreet, profile.shippingCity, profile.shippingState]
            .filter(Boolean)
            .join(", ")}
          {profile.shippingZipCode ? ` ${profile.shippingZipCode}` : ""}
        </dd>
      </div>
    </dl>
  );
}

export default async function AccountOverviewPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const [profile, orders] = await Promise.all([
    getCustomerProfile(session.user.id),
    getOrdersForUser(session.user.id),
  ]);

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  return (
    <>
      <section className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
              Saved Details
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Customer Information
            </h2>
          </div>
          <Link
            href="/account/profile"
            className="rounded-full border border-purple-500/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
          >
            Manage Profile
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-purple-900/40 bg-black/50 p-5">
          <ProfileSummary profile={profile} />
        </div>
      </section>

      <section className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
              Recent Activity
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Latest Orders
            </h2>
          </div>
          <Link
            href="/account/orders"
            className="rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500"
          >
            View All
          </Link>
        </div>
        <div className="mt-6 space-y-4">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No orders yet. Your purchases will appear here.
            </p>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-purple-900/40 bg-black/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Order {formatOrderNumber(order.orderNumber)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full border border-purple-500/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
                    {order.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap justify-between text-sm text-zinc-300">
                  <span>{order.totalUnits} units</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

