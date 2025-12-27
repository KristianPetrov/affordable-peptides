"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useStorefront } from "@/components/store/StorefrontContext";
import { createOrderAction } from "@/app/actions/orders";
import { applyReferralCodeAction } from "@/app/actions/referrals";
import type { CustomerProfile } from "@/lib/db";
import { calculateShippingCost } from "@/lib/shipping";
import type { AppliedReferralResult } from "@/types/referrals";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
} | null;

type CheckoutClientProps = {
  profile: CustomerProfile | null;
  sessionUser: SessionUser;
};

export function CheckoutClient ({ profile, sessionUser }: CheckoutClientProps)
{
  const router = useRouter();
  const { cartItems, subtotal, totalUnits, lineItemTotals, clearCart } = useStorefront();
  const [isPending, startTransition] = useTransition();
  const [isApplyingReferral, startReferralTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveProfile, setSaveProfile] = useState(Boolean(sessionUser));
  const [referralInput, setReferralInput] = useState("");
  const [referralResult, setReferralResult] =
    useState<AppliedReferralResult | null>(null);
  const appliedReferral =
    referralResult && referralResult.status === "applied" ? referralResult : null;
  const referralDiscount = appliedReferral?.discountAmount ?? 0;
  const discountedSubtotal = useMemo(
    () => Math.max(0, subtotal - referralDiscount),
    [subtotal, referralDiscount]
  );
  const shippingCost = useMemo(
    () =>
      // Free-shipping qualification is based on the pre-discount subtotal
      // so that applying a referral discount doesn't remove free shipping.
      calculateShippingCost(subtotal),
    [subtotal]
  );
  const total = useMemo(
    () => discountedSubtotal + shippingCost,
    [discountedSubtotal, shippingCost]
  );
  const previousSubtotalRef = useRef(subtotal);

  const defaultFormValues = useMemo(
    () => ({
      customerName: profile?.fullName ?? sessionUser?.name ?? "",
      customerEmail: sessionUser?.email ?? "",
      customerPhone: profile?.phone ?? "",
      shippingStreet: profile?.shippingStreet ?? "",
      shippingCity: profile?.shippingCity ?? "",
      shippingState: profile?.shippingState ?? "",
      shippingZipCode: profile?.shippingZipCode ?? "",
      shippingCountry: profile?.shippingCountry ?? "United States",
    }),
    [profile, sessionUser]
  );

  const [formData, setFormData] = useState(defaultFormValues);

  const isLoggedIn = Boolean(sessionUser);

  useEffect(() =>
  {
    const previousSubtotal = previousSubtotalRef.current;
    previousSubtotalRef.current = subtotal;

    if (appliedReferral && Math.abs(previousSubtotal - subtotal) > 0.01) {
      const timeoutId = window.setTimeout(() =>
      {
        setReferralResult(null);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [subtotal, appliedReferral]);

  if (cartItems.length === 0) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-4">
            Your cart is empty
          </h1>
          <Link
            href="/store"
            className="inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) =>
  {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleApplyReferral = () =>
  {
    if (!formData.customerEmail.trim()) {
      setReferralResult({
        status: "error",
        message: "Enter your email before applying a referral code.",
      });
      return;
    }
    if (!referralInput.trim()) {
      setReferralResult({
        status: "error",
        message: "Enter a referral code to continue.",
      });
      return;
    }

    startReferralTransition(async () =>
    {
      const result = await applyReferralCodeAction({
        code: referralInput,
        customerEmail: formData.customerEmail,
        cartItems,
        cartSubtotal: subtotal,
      });
      setReferralResult(result);
      if (result.status === "applied") {
        setReferralInput(result.code);
      }
    });
  };

  const handleClearReferral = () =>
  {
    setReferralResult(null);
    setReferralInput("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) =>
  {
    e.preventDefault();
    setError(null);

    startTransition(async () =>
    {
      const result = await createOrderAction({
        items: cartItems,
        subtotal: discountedSubtotal,
        cartSubtotal: subtotal,
        totalUnits,
        saveProfile: isLoggedIn && saveProfile,
        referralCode: appliedReferral?.code,
        ...formData,
      });

      if (result.success) {
        clearCart();
        router.push(
          `/checkout/thank-you?orderId=${result.orderId}&orderNumber=${result.orderNumber}&orderAmount=${total.toFixed(
            2
          )}`
        );
        return;
      }

      setError(result.error);
    });
  };

  return (
    <main className="px-6 py-12 sm:px-12 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isLoggedIn
              ? `Logged in as ${sessionUser?.email}`
              : "Checkout as a guest or sign in to save your details and track orders."}
          </p>
          {!isLoggedIn && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/account/login?callbackUrl=/checkout"
                className="rounded-full border border-purple-500/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/account/register"
                className="rounded-full bg-purple-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
                <h2 className="mb-6 text-xl font-semibold text-white">
                  Customer Information
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="customerName"
                      className="mb-2 block text-sm font-medium text-purple-200"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      name="customerName"
                      required
                      value={formData.customerName}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerEmail"
                      className="mb-2 block text-sm font-medium text-purple-200"
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="customerEmail"
                      name="customerEmail"
                      required
                      value={formData.customerEmail}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customerPhone"
                      className="mb-2 block text-sm font-medium text-purple-200"
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="customerPhone"
                      name="customerPhone"
                      required
                      value={formData.customerPhone}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                      placeholder="(555) 555-5555"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
                <h2 className="mb-6 text-xl font-semibold text-white">
                  Shipping Address
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="shippingStreet"
                      className="mb-2 block text-sm font-medium text-purple-200"
                    >
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="shippingStreet"
                      name="shippingStreet"
                      required
                      value={formData.shippingStreet}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="shippingCity"
                        className="mb-2 block text-sm font-medium text-purple-200"
                      >
                        City *
                      </label>
                      <input
                        type="text"
                        id="shippingCity"
                        name="shippingCity"
                        required
                        value={formData.shippingCity}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                        placeholder="Los Angeles"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="shippingState"
                        className="mb-2 block text-sm font-medium text-purple-200"
                      >
                        State *
                      </label>
                      <input
                        type="text"
                        id="shippingState"
                        name="shippingState"
                        required
                        value={formData.shippingState}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                        placeholder="CA"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="shippingZipCode"
                        className="mb-2 block text-sm font-medium text-purple-200"
                      >
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        id="shippingZipCode"
                        name="shippingZipCode"
                        required
                        value={formData.shippingZipCode}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                        placeholder="90001"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="shippingCountry"
                        className="mb-2 block text-sm font-medium text-purple-200"
                      >
                        Country *
                      </label>
                      <input
                        type="text"
                        id="shippingCountry"
                        name="shippingCountry"
                        required
                        value={formData.shippingCountry}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                      />
                    </div>
                  </div>
                </div>
                {isLoggedIn && (
                  <label className="mt-6 flex items-center gap-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border border-purple-900/40 bg-black/60 text-purple-500 focus:ring-purple-400"
                      checked={saveProfile}
                      onChange={(event) => setSaveProfile(event.target.checked)}
                    />
                    Save this information to my account
                  </label>
                )}
              </div>

              <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Referral Program
                    </h2>
                    <p className="text-sm text-zinc-400">
                      Apply a partner code to unlock a first-order discount.
                    </p>
                  </div>
                  {appliedReferral && (
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-green-200">
                      Applied
                    </span>
                  )}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    name="referralCode"
                    placeholder="Enter referral code"
                    value={referralInput}
                    onChange={(event) =>
                      setReferralInput(event.target.value.toUpperCase())
                    }
                    className="flex-1 rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-black"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleApplyReferral}
                      disabled={
                        isApplyingReferral || referralInput.trim().length === 0
                      }
                      className="rounded-full bg-purple-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-900/40"
                    >
                      {isApplyingReferral ? "Applying..." : "Apply Code"}
                    </button>
                    {referralResult && (
                      <button
                        type="button"
                        onClick={handleClearReferral}
                        className="rounded-full border border-purple-900/60 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-200 transition hover:border-purple-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {referralResult && (
                  <div
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${referralResult.status === "applied"
                        ? "border-green-500/30 bg-green-500/10 text-green-100"
                        : referralResult.status === "already-attributed"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-100"
                          : "border-red-500/30 bg-red-500/10 text-red-100"
                      }`}
                  >
                    {referralResult.message}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/60 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-purple-600 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 focus:outline-none focus:visible:ring-2 focus:visible:ring-purple-400 focus:visible:ring-offset-2 focus:visible:ring-offset-black disabled:cursor-not-allowed disabled:bg-purple-900/40"
              >
                {isPending ? "Submitting Order..." : "Place Order (Pay Manually)"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Order Summary
              </h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex justify-between text-sm text-zinc-300"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {item.productName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {item.variantLabel} • {item.count}× Qty {item.tierQuantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">
                        {formatCurrency(
                          lineItemTotals[item.key] ??
                          item.tierPrice * item.count
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2 border-t border-purple-900/40 pt-4">
                <div className="flex justify-between text-sm text-zinc-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {referralDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Referral Discount</span>
                    <span>-{formatCurrency(referralDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-zinc-300">
                  <span>Shipping</span>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-green-400">FREE</span>
                    ) : (
                      formatCurrency(shippingCost)
                    )}
                  </span>
                </div>
                {shippingCost > 0 && subtotal < 300 && (
                  <div className="text-xs text-purple-300">
                    Free shipping on orders over $300
                  </div>
                )}
                <div className="flex justify-between border-t border-purple-900/40 pt-2 text-lg font-semibold text-white">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {totalUnits} unit{totalUnits === 1 ? "" : "s"}
                </div>
                <div className="mt-2 text-xs text-purple-300">
                  Shipped within 48 hours
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

