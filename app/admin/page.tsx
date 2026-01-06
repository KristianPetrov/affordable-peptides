import Link from "next/link";
import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import ReferralDashboard from "@/components/admin/ReferralDashboard";
import { getAllOrders } from "@/lib/db";
import { formatOrderNumber } from "@/lib/orders";
import
  {
    updateProductStockAction,
  } from "@/app/actions/admin";
import { auth, signOut } from "@/lib/auth";
import { calculateVolumePricing } from "@/lib/cart-pricing";
import { calculateShippingCost } from "@/lib/shipping";
import { getProductsWithInventory } from "@/lib/products.server";
import { getReferralDashboardData } from "@/lib/referrals";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const MONTH_OPTIONS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
] as const;

type RevenueChartPoint = {
  label: string;
  paid: number;
  pending: number;
};

type ChartGranularity = "day" | "month";

function RevenueChart ({
  data,
  granularity,
}: {
  data: RevenueChartPoint[];
  granularity: ChartGranularity;
})
{
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-purple-900/40 bg-black/60 p-8 text-center text-sm text-zinc-400">
        No revenue data for the selected period yet.
      </div>
    );
  }

  const chartWidth = 720;
  const chartHeight = 240;
  const paddingY = 24;
  const usableHeight = chartHeight - paddingY * 2;
  const maxValue = data.reduce(
    (max, point) => Math.max(max, point.paid, point.pending),
    0
  );
  const safeMax = maxValue > 0 ? maxValue : 1;
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const buildPath = (key: "paid" | "pending") =>
    data
      .map((point, index) =>
      {
        const x = data.length === 1 ? chartWidth / 2 : index * xStep;
        const y =
          paddingY +
          usableHeight -
          (point[key] / safeMax) * usableHeight;
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  const paidPath = buildPath("paid");
  const pendingPath = buildPath("pending");
  const labelFrequency =
    granularity === "day"
      ? Math.max(1, Math.ceil(data.length / 8))
      : 1;

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-56 w-full"
          role="img"
          aria-label="Revenue trend chart"
        >
          <defs>
            <linearGradient
              id="paidGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient
              id="pendingGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) =>
          {
            const y = paddingY + usableHeight * ratio;
            return (
              <line
                key={ratio}
                x1={0}
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            );
          })}
          <path
            d={pendingPath}
            fill="none"
            stroke="url(#pendingGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeOpacity={0.8}
          />
          <path
            d={paidPath}
            fill="none"
            stroke="url(#paidGradient)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="grid auto-cols-fr grid-flow-col gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">
        {data.map((point, index) =>
        {
          const shouldShowLabel =
            granularity === "month" ||
            index === 0 ||
            index === data.length - 1 ||
            index % Math.max(1, labelFrequency) === 0;
          return (
            <span key={`${point.label}-${index}`} className="text-center">
              {shouldShowLabel ? point.label : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

async function SignOutButton ()
{
  return (
    <form
      action={async () =>
      {
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
  searchParams?: Promise<{
    view?: string;
    search?: string;
    month?: string;
    year?: string;
  }>;
};

export default async function AdminPage ({ searchParams }: AdminPageProps)
{
  const session = await auth();
  const params = searchParams ? await searchParams : undefined;
  const activeView =
    params?.view === "inventory"
      ? "inventory"
      : params?.view === "referrals"
        ? "referrals"
        : "orders";
  const searchQuery = params?.search || "";

  // Redirect to login if not authenticated
  if (!session) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/account");
  }

  const orders =
    activeView === "orders" ? await getAllOrders(searchQuery) : [];
  const productsWithInventory =
    activeView === "inventory" ? await getProductsWithInventory() : [];
  const referralYearParam = params?.year;
  const referralParsedYear = referralYearParam ? Number(referralYearParam) : Number.NaN;
  const referralMonthParam = params?.month;
  const referralParsedMonth =
    referralMonthParam && referralMonthParam !== "all"
      ? Number(referralMonthParam)
      : null;
  const referralDashboard =
    activeView === "referrals"
      ? await getReferralDashboardData({
        year: Number.isFinite(referralParsedYear) ? referralParsedYear : undefined,
        month:
          typeof referralParsedMonth === "number" && Number.isFinite(referralParsedMonth)
            ? referralParsedMonth
            : null,
      })
      : null;
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

  const orderYears = Array.from(
    new Set(
      orders.map((order) => new Date(order.createdAt).getFullYear())
    )
  ).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const fallbackYear = orderYears[0] ?? currentYear;
  const yearParam = params?.year;
  const parsedYear = yearParam ? Number(yearParam) : Number.NaN;
  const selectedYear = Number.isFinite(parsedYear) ? parsedYear : fallbackYear;
  const yearOptions = (() =>
  {
    const set = new Set<number>(orderYears);
    if (Number.isFinite(selectedYear)) {
      set.add(selectedYear);
    }
    if (set.size === 0) {
      set.add(currentYear);
    }
    return Array.from(set).sort((a, b) => b - a);
  })();
  const yearSelectValue = Number.isFinite(parsedYear)
    ? String(parsedYear)
    : String(selectedYear);

  const monthParam = params?.month;
  let selectedMonth: number | null = null;
  if (monthParam && monthParam !== "all") {
    const parsedMonth = Number(monthParam);
    if (
      Number.isFinite(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12
    ) {
      selectedMonth = parsedMonth;
    }
  }
  const monthSelectValue = selectedMonth ? String(selectedMonth) : "all";
  const selectedMonthLabel = selectedMonth
    ? MONTH_OPTIONS.find((month) => month.value === selectedMonth)?.label ??
    `Month ${selectedMonth}`
    : null;

  const revenueFilteredOrders = orders.filter((order) =>
  {
    const createdDate = new Date(order.createdAt);
    const matchesYear = Number.isFinite(selectedYear)
      ? createdDate.getFullYear() === selectedYear
      : true;
    const matchesMonth = selectedMonth
      ? createdDate.getMonth() + 1 === selectedMonth
      : true;
    return matchesYear && matchesMonth;
  });

  const paidOrdersForRevenue = revenueFilteredOrders.filter(
    (order) => order.status === "PAID" || order.status === "SHIPPED"
  );
  const pendingOrdersForRevenue = revenueFilteredOrders.filter(
    (order) => order.status === "PENDING_PAYMENT"
  );

  const calculateOrderTotal = (order: (typeof orders)[number]) => {
    const itemsSubtotal = calculateVolumePricing(order.items).subtotal;
    const shippingCost = calculateShippingCost(itemsSubtotal);
    return order.subtotal + shippingCost;
  };

  const totalPaidRevenue = paidOrdersForRevenue.reduce(
    (sum, order) => sum + calculateOrderTotal(order),
    0
  );
  const potentialRevenue = pendingOrdersForRevenue.reduce(
    (sum, order) => sum + calculateOrderTotal(order),
    0
  );
  const paidOrderCount = paidOrdersForRevenue.length;
  const pendingOrderCount = pendingOrdersForRevenue.length;

  const chartGranularity: ChartGranularity = selectedMonth ? "day" : "month";
  const revenueChartData: RevenueChartPoint[] = (() =>
  {
    const bucketMap = new Map<number, RevenueChartPoint>();
    revenueFilteredOrders.forEach((order) =>
    {
      const createdDate = new Date(order.createdAt);
      const bucketKey = selectedMonth
        ? createdDate.getDate()
        : createdDate.getMonth() + 1;
      const bucketLabel = selectedMonth
        ? createdDate.getDate().toString().padStart(2, "0")
        : MONTH_OPTIONS[bucketKey - 1]?.short ?? `M${bucketKey}`;
      if (!bucketMap.has(bucketKey)) {
        bucketMap.set(bucketKey, {
          label: bucketLabel,
          paid: 0,
          pending: 0,
        });
      }
      const bucket = bucketMap.get(bucketKey)!;
      if (order.status === "PENDING_PAYMENT") {
        bucket.pending += calculateOrderTotal(order);
      } else if (order.status === "PAID" || order.status === "SHIPPED") {
        bucket.paid += calculateOrderTotal(order);
      }
    });
    return Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  })();

  const selectedPeriodLabel = selectedMonthLabel
    ? `${selectedMonthLabel} ${selectedYear}`
    : `All Months · ${selectedYear}`;
  const selectedPeriodSubLabel = selectedMonth
    ? "Daily totals · USD"
    : "Monthly totals · USD";

  const filterResetParams = new URLSearchParams();
  if (searchQuery) {
    filterResetParams.set("search", searchQuery);
  }
  const resetFiltersHref =
    filterResetParams.size > 0
      ? `/admin?${filterResetParams.toString()}`
      : "/admin";

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
              {
                id: "referrals",
                label: "Referrals",
                href: "/admin?view=referrals",
              },
            ].map((tab) =>
            {
              const isActive = activeView === tab.id;
              return (
                <Link
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? "page" : undefined}
                  href={tab.href}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${isActive
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
            <section className="mb-10 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6">
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

          {activeView === "referrals" && referralDashboard && (
            <ReferralDashboard data={referralDashboard} />
          )}

          {activeView === "referrals" && !referralDashboard && (
            <section className="rounded-3xl border border-purple-900/60 bg-black/60 p-12 text-center text-zinc-400">
              <p>Loading referral data...</p>
            </section>
          )}

          {activeView === "orders" && (
            <>
              <details
                className="group mb-10 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6"

              >
                <summary className="flex cursor-pointer list-none flex-col gap-2 border-b border-purple-900/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                      Revenue Overview
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      Paid vs Outstanding Revenue
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Monitor how much cash has cleared and what&apos;s still waiting on payment.
                      Filters below only affect this revenue overview.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                    <span className="hidden group-open:inline">Tap to Collapse</span>
                    <span className="group-open:hidden">Tap to Expand</span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-900/60 bg-black/60 text-lg transition group-open:rotate-180"
                    >
                      ˇ
                    </span>
                  </div>
                </summary>
                <div className="mt-6 grid gap-10 lg:grid-cols-[320px,1fr]">
                  <div className="space-y-6">
                    <form
                      action="/admin"
                      method="get"
                      className="rounded-2xl border border-purple-900/40 bg-black/50 p-4"
                    >
                      <input type="hidden" name="view" value="orders" />
                      {searchQuery && (
                        <input type="hidden" name="search" value={searchQuery} />
                      )}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor="year"
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200"
                          >
                            Year
                          </label>
                          <select
                            id="year"
                            name="year"
                            defaultValue={yearSelectValue}
                            className="rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            {yearOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor="month"
                            className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200"
                          >
                            Month
                          </label>
                          <select
                            id="month"
                            name="month"
                            defaultValue={monthSelectValue}
                            className="rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          >
                            <option value="all">All months</option>
                            {MONTH_OPTIONS.map((month) => (
                              <option key={month.value} value={month.value}>
                                {month.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="flex-1 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 sm:flex-none"
                        >
                          Apply Filters
                        </button>
                        <Link
                          href={resetFiltersHref}
                          className="flex-1 rounded-full border border-purple-900/50 bg-black/60 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-purple-100 transition hover:border-purple-500/60 sm:flex-none"
                        >
                          Reset
                        </Link>
                      </div>
                      <p className="mt-3 text-xs text-zinc-500">
                        Revenue filters do not change the order list below.
                      </p>
                    </form>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl border border-purple-900/40 bg-black/50 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-green-300">
                          Paid Revenue
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                          {formatCurrency(totalPaidRevenue)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {paidOrderCount} paid order
                          {paidOrderCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-purple-900/40 bg-black/50 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
                          Potential Revenue
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                          {formatCurrency(potentialRevenue)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {pendingOrderCount} pending payment
                          {pendingOrderCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                          Selected Period
                        </p>
                        <h3 className="text-xl font-semibold text-white">
                          {selectedPeriodLabel}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {selectedPeriodSubLabel}
                      </p>
                    </div>
                    <RevenueChart
                      data={revenueChartData}
                      granularity={chartGranularity}
                    />
                    {revenueChartData.length > 0 && (
                      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Paid revenue
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          Pending payment
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
              <div className="mb-6">
                <form method="get" action="/admin" className="flex gap-3">
                  <input type="hidden" name="view" value="orders" />
                  {params?.year && (
                    <input type="hidden" name="year" value={params.year} />
                  )}
                  {params?.month && (
                    <input type="hidden" name="month" value={params.month} />
                  )}
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
                <div className="rounded-2xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6">
                  <div className="text-sm text-zinc-400">Pending Payment</div>
                  <div className="mt-2 text-3xl font-semibold text-yellow-400">
                    {statusCounts.PENDING_PAYMENT}
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6">
                  <div className="text-sm text-zinc-400">Paid</div>
                  <div className="mt-2 text-3xl font-semibold text-blue-400">
                    {statusCounts.PAID}
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6">
                  <div className="text-sm text-zinc-400">Shipped</div>
                  <div className="mt-2 text-3xl font-semibold text-green-400">
                    {statusCounts.SHIPPED}
                  </div>
                </div>
                <div className="rounded-2xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6">
                  <div className="text-sm text-zinc-400">Total Orders</div>
                  <div className="mt-2 text-3xl font-semibold text-white">
                    {orders.length}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {sortedOrders.length === 0 ? (
                  <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-12 text-center">
                    <p className="text-zinc-400">
                      {searchQuery ? "No orders found matching your search" : "No orders yet"}
                    </p>
                  </div>
                ) : (
                  sortedOrders.map((order) =>
                  {
                    const pricing = calculateVolumePricing(order.items);
                    const itemsSubtotal = pricing.subtotal;
                    const referralDiscount = order.referralDiscount ?? 0;
                    const discountedSubtotal = order.subtotal;
                    const shippingCost = calculateShippingCost(itemsSubtotal);
                    const orderTotal = discountedSubtotal + shippingCost;
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
                        className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6"
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
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusColors[order.status]
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
                                  <span className="text-zinc-400">Items Subtotal:</span>
                                  <span className="font-semibold text-white">
                                    {formatCurrency(itemsSubtotal)}
                                  </span>
                                </div>
                                {referralDiscount > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Referral Discount:</span>
                                    <span className="font-semibold text-green-300">
                                      -{formatCurrency(referralDiscount)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-400">Subtotal (After Discount):</span>
                                  <span className="font-semibold text-white">
                                    {formatCurrency(discountedSubtotal)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-400">Shipping:</span>
                                  <span className="font-semibold text-white">
                                    {shippingCost === 0 ? "FREE" : formatCurrency(shippingCost)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-400">Total:</span>
                                  <span className="font-semibold text-white">
                                    {formatCurrency(orderTotal)}
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

