import {
  createReferralCodeAction,
  createReferralPartnerAction,
  deleteReferralCodeAction,
  deleteReferralPartnerAction,
  toggleReferralCodeStatusAction,
  toggleReferralPartnerStatusAction,
} from "@/app/actions/referrals";
import { CopyButton } from "@/components/admin/CopyButton";
import type {
  ReferralCodeSummary,
  ReferralDashboardData,
} from "@/types/referrals";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

type ReferralDashboardProps = {
  data: ReferralDashboardData;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return dateFormatter.format(date);
}

function formatDiscount(code: ReferralCodeSummary): string {
  if (code.discountType === "percent") {
    return `${numberFormatter.format(code.discountValue)}% off`;
  }
  return `${currencyFormatter.format(code.discountValue)} off`;
}

function formatUsage(code: ReferralCodeSummary): string {
  if (typeof code.maxTotalRedemptions === "number" && code.maxTotalRedemptions > 0) {
    return `${code.currentRedemptions} / ${code.maxTotalRedemptions}`;
  }
  return `${code.currentRedemptions} used`;
}

function formatMinimumOrderSubtotal(code: ReferralCodeSummary): string {
  if (typeof code.minOrderSubtotal === "number" && code.minOrderSubtotal > 0) {
    return currencyFormatter.format(code.minOrderSubtotal);
  }
  return "—";
}

export default function ReferralDashboard({ data }: ReferralDashboardProps) {
  const hasPartners = data.partners.length > 0;
  const activePartnerCount = data.partners.filter((partner) => partner.active).length;
  const selectedMonthLabel = data.filters.selectedMonth
    ? MONTH_OPTIONS.find((m) => m.value === data.filters.selectedMonth)?.label ??
      `Month ${data.filters.selectedMonth}`
    : "All months";
  const selectedPeriodLabel = `${selectedMonthLabel} · ${data.filters.selectedYear}`;

  const overviewMetrics = [
    {
      label: "Partners",
      value: data.totals.partners.toLocaleString(),
      sublabel: `${activePartnerCount} active`,
    },
    {
      label: "Active Codes",
      value: data.totals.activeCodes.toLocaleString(),
      sublabel: "Live discounts",
    },
    {
      label: "Attributed Customers",
      value: data.totals.totalCustomers.toLocaleString(),
      sublabel: "Unique buyers",
    },
    {
      label: "Orders (30d)",
      value: data.totals.attributedOrdersLast30Days.toLocaleString(),
      sublabel: "Partner-driven",
    },
    {
      label: "Revenue (period)",
      value: currencyFormatter.format(data.totals.periodRevenue),
      sublabel: selectedPeriodLabel,
    },
    {
      label: "Commission (period)",
      value: currencyFormatter.format(data.totals.periodCommission),
      sublabel: selectedPeriodLabel,
    },
    {
      label: "Lifetime Revenue",
      value: currencyFormatter.format(data.totals.lifetimeRevenue),
      sublabel: "Across all partners",
    },
    {
      label: "Lifetime Commission",
      value: currencyFormatter.format(data.totals.lifetimeCommission),
      sublabel: "Owed to partners",
    },
    {
      label: "Active Partners",
      value: data.totals.activePartners.toLocaleString(),
      sublabel: "Ready to send traffic",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6">
        <div className="flex flex-col gap-2 border-b border-purple-900/40 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
            Referral Program Overview
          </p>
          <h2 className="text-2xl font-semibold text-white">Performance Snapshot</h2>
          <p className="text-sm text-zinc-400">
            Monitor partner activity, total attributed revenue, and live codes at a glance.
          </p>
        </div>
        <form
          action="/admin"
          method="get"
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-purple-900/40 bg-black/40 p-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <input type="hidden" name="view" value="referrals" />
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Year
              </label>
              <select
                name="year"
                defaultValue={String(data.filters.selectedYear)}
                className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                {data.filters.years.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Month
              </label>
              <select
                name="month"
                defaultValue={data.filters.selectedMonth ? String(data.filters.selectedMonth) : "all"}
                className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All months</option>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={String(month.value)}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-full bg-purple-600 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-500"
          >
            Apply
          </button>
        </form>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-purple-900/40 bg-black/40 p-4"
            >
              <div className="text-sm text-zinc-400">{metric.label}</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {metric.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.25em] text-purple-300">
                {metric.sublabel}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          action={createReferralPartnerAction}
          className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6"
        >
          <div className="flex flex-col gap-2 border-b border-purple-900/40 pb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              New Partner
            </p>
            <h3 className="text-xl font-semibold text-white">
              Create Referral Partner
            </h3>
            <p className="text-sm text-zinc-400">
              Add influencer or clinic details so they can start generating referral codes immediately.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Partner Name
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g., Longevity Clinic NY"
                className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="contactName"
                  placeholder="Primary contact"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="contact@partner.com"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contactPhone"
                  placeholder="+1 (555) 123-4567"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Commission % of Sales
                </label>
                <input
                  type="number"
                  name="commissionPercent"
                  min={0}
                  max={100}
                  step={0.01}
                  required
                  defaultValue={10}
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  This is used to calculate partner payouts on all attributed future orders.
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Internal notes, payout terms, or campaign info..."
                className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="w-full rounded-full bg-purple-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Save Partner
            </button>
          </div>
        </form>

        <form
          action={createReferralCodeAction}
          className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6"
        >
          <div className="flex flex-col gap-2 border-b border-purple-900/40 pb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
              Referral Codes
            </p>
            <h3 className="text-xl font-semibold text-white">
              Generate Referral Code
            </h3>
            <p className="text-sm text-zinc-400">
              Create limited-use or evergreen codes with built-in eligibility windows.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                Partner
              </label>
              <select
                name="partnerId"
                required
                disabled={!hasPartners}
                className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:border-purple-900/20 disabled:text-zinc-500"
                defaultValue=""
              >
                <option value="" disabled>
                  {hasPartners ? "Select partner..." : "Create a partner first"}
                </option>
                {data.partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Code
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="E.g., DRJONES50"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="Displayed internally only"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Discount Type
                </label>
                <select
                  name="discountType"
                  defaultValue="percent"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Discount Value
                </label>
                <input
                  type="number"
                  name="discountValue"
                  min={0}
                  step={0.01}
                  required
                  defaultValue={10}
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Min Order Subtotal
                </label>
                <input
                  type="number"
                  name="minOrderSubtotal"
                  min={0}
                  step={0.01}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Max Redemptions
                </label>
                <input
                  type="number"
                  name="maxTotalRedemptions"
                  min={1}
                  step={1}
                  placeholder="Unlimited if blank"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Starts At
                </label>
                <input
                  type="datetime-local"
                  name="startsAt"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Expires At
                </label>
                <input
                  type="datetime-local"
                  name="expiresAt"
                  className="mt-2 w-full rounded-lg border border-purple-900/40 bg-black/70 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <button
              type="submit"
              disabled={!hasPartners}
              className="w-full rounded-full bg-purple-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-900/50"
            >
              Generate Code
            </button>
            {!hasPartners && (
              <p className="text-center text-xs text-zinc-500">
                Create a partner before issuing referral codes.
              </p>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 border-b border-purple-900/40 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
            Partner Detail
          </p>
          <h3 className="text-xl font-semibold text-white">Manage Partners & Codes</h3>
          <p className="text-sm text-zinc-400">
            Toggle partner availability, pause individual codes, and review attributed performance.
          </p>
        </div>

        {data.partners.length === 0 ? (
          <div className="rounded-3xl border border-purple-900/60 bg-black/60 p-12 text-center">
            <p className="text-zinc-400">
              No referral partners yet. Create one above to start tracking influencer or clinic performance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.partners.map((partner) => {
              const activeCodes = partner.codes.filter((code) => code.active).length;
              return (
                <article
                  key={partner.id}
                  className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#0a0012] via-[#05000a] to-black p-6"
                >
                  <header className="flex flex-col gap-4 border-b border-purple-900/30 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="text-2xl font-semibold text-white">{partner.name}</h4>
                      <p className="mt-1 text-sm text-zinc-400">
                        {partner.totalCustomers} customers · {activeCodes} active code
                        {activeCodes === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                          partner.active
                            ? "bg-green-500/10 text-green-300"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {partner.active ? "Active" : "Paused"}
                      </span>
                      <form action={toggleReferralPartnerStatusAction}>
                        <input type="hidden" name="partnerId" value={partner.id} />
                        <input
                          type="hidden"
                          name="nextStatus"
                          value={partner.active ? "inactive" : "active"}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-purple-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-200 transition hover:border-purple-300 hover:text-white"
                        >
                          {partner.active ? "Pause Partner" : "Activate Partner"}
                        </button>
                      </form>
                      <form action={deleteReferralPartnerAction}>
                        <input type="hidden" name="partnerId" value={partner.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:border-red-400 hover:text-white"
                        >
                          Delete Partner
                        </button>
                      </form>
                    </div>
                  </header>

                  <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    <div className="space-y-2 rounded-2xl border border-purple-900/30 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                        Performance
                      </p>
                      <div>
                        <p className="text-sm text-zinc-400">Revenue (period)</p>
                        <p className="text-xl font-semibold text-white">
                          {currencyFormatter.format(partner.periodRevenue)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {partner.periodOrders.toLocaleString()} order
                          {partner.periodOrders === 1 ? "" : "s"} · {selectedPeriodLabel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Commission (period)</p>
                        <p className="text-xl font-semibold text-white">
                          {currencyFormatter.format(partner.periodCommission)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Lifetime Revenue</p>
                        <p className="text-xl font-semibold text-white">
                          {currencyFormatter.format(partner.totalRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Lifetime Commission</p>
                        <p className="text-xl font-semibold text-white">
                          {currencyFormatter.format(partner.totalCommission)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
                        <div>
                          <p className="text-xs text-zinc-500">Customers</p>
                          <p className="font-semibold text-white">
                            {partner.totalCustomers.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">Last Order</p>
                          <p className="font-semibold text-white">{formatDate(partner.lastOrderAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-purple-900/30 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                        Contact
                      </p>
                      <dl className="space-y-2 text-sm text-zinc-300">
                        <div>
                          <dt className="text-xs text-zinc-500">Contact Name</dt>
                          <dd className="font-semibold text-white">
                            {partner.contactName ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-500">Email</dt>
                          <dd className="font-semibold text-white">
                            {partner.contactEmail ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-zinc-500">Phone</dt>
                          <dd className="font-semibold text-white">
                            {partner.contactPhone ?? "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="space-y-2 rounded-2xl border border-purple-900/30 bg-black/40 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                        Commission
                      </p>
                      <p className="text-sm text-zinc-400">
                        Used for partner payouts on attributed orders.
                      </p>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {numberFormatter.format(partner.commissionPercent)}% of sales
                      </div>
                      {partner.notes && (
                        <div className="mt-3 rounded-xl border border-purple-900/30 bg-black/50 p-3 text-sm text-zinc-300">
                          <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                            Notes
                          </p>
                          <p className="mt-1 whitespace-pre-line">{partner.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-purple-900/30 bg-black/40 p-4">
                    <div className="flex flex-col gap-2 border-b border-purple-900/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-purple-200">
                          Referral Codes
                        </p>
                        <p className="text-sm text-zinc-400">
                          {partner.codes.length === 0
                            ? "No codes for this partner yet."
                            : `${activeCodes} active · ${partner.codes.length} total`}
                        </p>
                      </div>
                    </div>

                    {partner.codes.length === 0 ? (
                      <p className="pt-4 text-sm text-zinc-400">
                        Use the generator above to add a referral code for {partner.name}.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {partner.codes
                          .slice()
                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                          .map((code) => (
                            <div
                              key={code.id}
                              className="rounded-xl border border-purple-900/40 bg-black/60 p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <p className="text-base font-semibold text-white">
                                    {code.code}
                                  </p>
                                  {code.description && (
                                    <p className="text-sm text-zinc-400">{code.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.25em] ${
                                      code.active
                                        ? "bg-green-500/10 text-green-300"
                                        : "bg-zinc-800 text-zinc-300"
                                    }`}
                                  >
                                    {code.active ? "Active" : "Paused"}
                                  </span>
                                  <CopyButton text={code.code} label="Copy Code" />
                                  <form action={toggleReferralCodeStatusAction}>
                                    <input type="hidden" name="codeId" value={code.id} />
                                    <input
                                      type="hidden"
                                      name="nextStatus"
                                      value={code.active ? "inactive" : "active"}
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-full border border-purple-500/40 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-purple-200 transition hover:border-purple-300 hover:text-white"
                                    >
                                      {code.active ? "Pause" : "Activate"}
                                    </button>
                                  </form>
                                <form action={deleteReferralCodeAction}>
                                  <input type="hidden" name="codeId" value={code.id} />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-red-500/40 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-red-200 transition hover:border-red-400 hover:text-white"
                                  >
                                    Delete
                                  </button>
                                </form>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs text-zinc-500">Discount</p>
                                  <p className="text-sm font-semibold text-white">
                                    {formatDiscount(code)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-500">Min Order</p>
                                  <p className="text-sm font-semibold text-white">
                                    {formatMinimumOrderSubtotal(code)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-500">Usage</p>
                                  <p className="text-sm font-semibold text-white">
                                    {formatUsage(code)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-500">Starts</p>
                                  <p className="text-sm font-semibold text-white">
                                    {formatDate(code.startsAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <p className="text-xs text-zinc-500">Expires</p>
                                <p className="text-sm font-semibold text-white">
                                  {formatDate(code.expiresAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}



