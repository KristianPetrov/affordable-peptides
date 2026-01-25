"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useRef, useState, useTransition, useMemo } from "react";
import { calculateOrderTotals, formatOrderNumber, type Order } from "@/lib/orders";
import { lookupOrderAction } from "@/app/actions/orders";

const statusStyles: Record<Order["status"], string> = {
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

type OrderLookupClientProps = {
  defaultOrderNumber?: string;
  defaultEmail?: string;
};

type LookupFormState = {
  orderNumber: string;
  customerEmail: string;
};

type LookupResultState = {
  order: Order | null;
  error: string | null;
  hasSearched: boolean;
};

export default function OrderLookupClient ({
  defaultOrderNumber = "",
  defaultEmail = "",
}: OrderLookupClientProps)
{
  const [formData, setFormData] = useState<LookupFormState>({
    orderNumber: defaultOrderNumber,
    customerEmail: defaultEmail,
  });
  const [result, setResult] = useState<LookupResultState>({
    order: null,
    error: null,
    hasSearched: false,
  });
  const [isPending, startTransition] = useTransition();
  const autoSubmittedRef = useRef(false);
  const orderTotals = useMemo(
    () => (result.order ? calculateOrderTotals(result.order) : null),
    [result.order]
  );

  const runLookup = useCallback(
    (payload?: LookupFormState) =>
    {
      const request = payload ?? formData;

      startTransition(async () =>
      {
        if (!request.orderNumber.trim()) {
          setResult({
            order: null,
            error: "Enter your order number to search.",
            hasSearched: true,
          });
          return;
        }

        const response = await lookupOrderAction({
          orderNumber: request.orderNumber,
          customerEmail: request.customerEmail,
        });

        if (response.success) {
          setResult({
            order: response.order,
            error: null,
            hasSearched: true,
          });
        } else {
          setResult({
            order: null,
            error: response.error,
            hasSearched: true,
          });
        }
      });
    },
    [formData, startTransition]
  );

  useEffect(() =>
  {
    if (!autoSubmittedRef.current && defaultOrderNumber) {
      autoSubmittedRef.current = true;
      runLookup({
        orderNumber: defaultOrderNumber,
        customerEmail: defaultEmail,
      });
    }
  }, [defaultOrderNumber, defaultEmail, runLookup]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) =>
  {
    event.preventDefault();
    runLookup();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void =>
  {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="orderNumber"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Order Number
          </label>
          <input
            id="orderNumber"
            name="orderNumber"
            type="text"
            required
            value={formData.orderNumber}
            onChange={handleChange}
            placeholder="123456"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
          />
        </div>
        <div>
          <label
            htmlFor="customerEmail"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Email Used at Checkout (optional)
          </label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            value={formData.customerEmail}
            onChange={handleChange}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-purple-600 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-purple-900/40"
        >
          {isPending ? "Looking up order..." : "Find My Order"}
        </button>
      </form>

      {result.error && (
        <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
          {result.error}
        </div>
      )}

      {result.order && (
        <div className="rounded-3xl border border-purple-900/40 bg-black/40 p-5 shadow-[0_25px_60px_rgba(70,0,110,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-900/30 pb-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Order {formatOrderNumber(result.order.orderNumber)}
              </p>
              <p className="text-xs text-zinc-500">
                Placed {new Date(result.order.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[result.order.status]}`}
            >
              {result.order.status.replace("_", " ")}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Shipping To
              </p>
              <p className="mt-1 text-sm text-white">
                {result.order.customerName}
              </p>
              <p className="text-sm text-zinc-400">
                {result.order.shippingAddress.street},{" "}
                {result.order.shippingAddress.city},{" "}
                {result.order.shippingAddress.state}{" "}
                {result.order.shippingAddress.zipCode}
              </p>
              <p className="text-sm text-zinc-500">
                {result.order.shippingAddress.country}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Total
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {formatCurrency(orderTotals?.total ?? result.order.subtotal)}
              </p>
              <p className="text-sm text-zinc-400">
                {result.order.totalUnits} unit
                {result.order.totalUnits === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-purple-900/30 bg-black/50 p-4 text-sm text-zinc-300">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200">
              Items
            </p>
            <ul className="space-y-1">
              {result.order.items.map((item, index) => (
                <li key={`${result?.order?.id}-${index}`}>
                  {item.productName} ({item.variantLabel}) — {item.count}× Qty{" "}
                  {item.tierQuantity}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-sm text-zinc-400">
            Need help? Text +1 (307) 202-5965 with
            your order number for the fastest response.
          </p>
        </div>
      )}

      {!result.order && result.hasSearched && !result.error && (
        <div className="rounded-2xl border border-purple-900/40 bg-black/30 p-6 text-sm text-zinc-300">
          We couldn&apos;t find an order with that number yet. Double-check the
          format (example: 123456) or try entering the email used at
          checkout.
        </div>
      )}
    </div>
  );
}

