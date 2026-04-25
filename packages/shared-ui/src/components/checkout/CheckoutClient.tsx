"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useStorefront } from "../store/StorefrontContext";
import type { AppliedReferralResult, CustomerProfile } from "@ap/shared-core";
import { calculateShippingCost } from "@ap/shared-core";
import {
  requireSharedUiAdapter,
  useSharedUiAdapters,
} from "@ap/shared-ui/adapters";

import { GreenPlaidIframe } from "./GreenPlaidIframe";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) =>
  currencyFormatter.format(value);

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string;
} | null;

type PaymentMethod = "greenbutton" | "manual";

type GreenPaymentData = {
  accountName: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
};

type CheckoutClientProps = {
  profile: CustomerProfile | null;
  sessionUser: SessionUser;
  /**
   * Green.Money `Client_ID` (MID) for the Plaid iframe. Pass from the server
   * using `GREEN_CLIENT_ID` / `GREEN_API_CLIENT_ID` so you do not need
   * `NEXT_PUBLIC_*` duplicates. Optional `NEXT_PUBLIC_GREEN_PLAID_CLIENT_ID` or
   * `NEXT_PUBLIC_GREEN_CLIENT_ID` still override when set.
   */
  greenMoneyPlaidClientId?: string | null;
};

export function CheckoutClient ({
  profile,
  sessionUser,
  greenMoneyPlaidClientId,
}: CheckoutClientProps)
{
  const router = useRouter();
  const { orderActions, referralActions, greenMoneyActions } =
    useSharedUiAdapters();
  const { cartItems, subtotal, totalUnits, lineItemTotals, clearCart } = useStorefront();
  const [isPending, startTransition] = useTransition();
  const [isApplyingReferral, startReferralTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveProfile, setSaveProfile] = useState(Boolean(sessionUser));
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("manual");
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
      billingStreet: profile?.shippingStreet ?? "",
      billingCity: profile?.shippingCity ?? "",
      billingState: profile?.shippingState ?? "",
      billingZipCode: profile?.shippingZipCode ?? "",
      billingCountry: profile?.shippingCountry ?? "United States",
    }),
    [profile, sessionUser]
  );

  const [formData, setFormData] = useState(defaultFormValues);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [greenPaymentData, setGreenPaymentData] = useState<GreenPaymentData>({
    accountName: defaultFormValues.customerName,
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    confirmAccountNumber: "",
  });

  const greenMidForPlaidIframe = useMemo(() =>
  {
    const fromServer = (greenMoneyPlaidClientId ?? "").trim();
    if (fromServer) {
      return fromServer;
    }
    return (
      process.env.NEXT_PUBLIC_GREEN_PLAID_CLIENT_ID?.trim() ||
      process.env.NEXT_PUBLIC_GREEN_CLIENT_ID?.trim() ||
      ""
    );
  }, [greenMoneyPlaidClientId]);

  const plaidLinkingAvailable = Boolean(greenMidForPlaidIframe);

  const [greenBankEntryMode, setGreenBankEntryMode] = useState<
    "manual" | "plaid"
  >(() => (plaidLinkingAvailable ? "plaid" : "manual"));
  const [greenPlaidPayorId, setGreenPlaidPayorId] = useState<string | null>(
    null
  );
  /** Same Client_ID Green used in CreateCustomer — must match Plaid iframe or Green returns "customer not found". */
  const [greenPlaidMerchantClientId, setGreenPlaidMerchantClientId] = useState<
    string | null
  >(null);
  const [plaidBankLinkComplete, setPlaidBankLinkComplete] = useState(false);
  const [plaidMaskedBank, setPlaidMaskedBank] = useState<{
    bankName: string;
    routingDisplay: string;
    accountDisplay: string;
  } | null>(null);
  const [isPreparingPlaid, startPlaidPrepare] = useTransition();
  const [isSyncingPlaidBank, startPlaidBankSync] = useTransition();

  const clearPlaidSessionRef = useRef(greenMoneyActions.clearPlaidSession);
  clearPlaidSessionRef.current = greenMoneyActions.clearPlaidSession;

  const isLoggedIn = Boolean(sessionUser);
  const isOpeningGreenButton = false;

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

  useEffect(() =>
  {
    if (paymentMethod !== "greenbutton") {
      setGreenBankEntryMode(plaidLinkingAvailable ? "plaid" : "manual");
      setGreenPlaidPayorId(null);
      setGreenPlaidMerchantClientId(null);
      setPlaidBankLinkComplete(false);
      setPlaidMaskedBank(null);
      void clearPlaidSessionRef.current?.();
    }
    // Intentionally omit `greenMoneyActions`: the context object is recreated when
    // adapter props are unstable; only paymentMethod / plaid availability should
    // drive this cleanup (latest clearPlaidSession via ref).
  }, [paymentMethod, plaidLinkingAvailable]);

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

  const handleGreenPaymentChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) =>
  {
    setGreenPaymentData({
      ...greenPaymentData,
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
      const applyReferralCodeAction = requireSharedUiAdapter(
        referralActions.applyReferralCode,
        "referralActions.applyReferralCode"
      );
      const result = await applyReferralCodeAction({
        code: referralInput,
        customerEmail: formData.customerEmail,
        cartItems,
        cartSubtotal: subtotal,
        customerPhone: formData.customerPhone,
        shippingStreet: formData.shippingStreet,
        shippingZipCode: formData.shippingZipCode,
        shippingCountry: formData.shippingCountry,
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

  const resetPlaidLinkingState = () =>
  {
    setGreenPlaidPayorId(null);
    setGreenPlaidMerchantClientId(null);
    setPlaidBankLinkComplete(false);
    setPlaidMaskedBank(null);
    void greenMoneyActions.clearPlaidSession?.();
  };

  const handlePrepareGreenPlaid = () =>
  {
    setError(null);
    startPlaidPrepare(async () =>
    {
      const preparePlaidPayor = requireSharedUiAdapter(
        greenMoneyActions.preparePlaidPayor,
        "greenMoneyActions.preparePlaidPayor"
      );
      const result = await preparePlaidPayor({
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        shippingStreet: formData.shippingStreet,
        shippingCity: formData.shippingCity,
        shippingState: formData.shippingState,
        shippingZipCode: formData.shippingZipCode,
        shippingCountry: formData.shippingCountry,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setGreenPlaidPayorId(result.payorId);
      setGreenPlaidMerchantClientId(result.greenClientId);
      setPlaidBankLinkComplete(false);
      setPlaidMaskedBank(null);
    });
  };

  const syncPlaidLinkedBank = () =>
  {
    startPlaidBankSync(async () =>
    {
      const fetchPlaidLinkedBank = requireSharedUiAdapter(
        greenMoneyActions.fetchPlaidLinkedBank,
        "greenMoneyActions.fetchPlaidLinkedBank"
      );
      const result = await fetchPlaidLinkedBank();
      if (!result.success) {
        setError(result.error);
        setPlaidBankLinkComplete(false);
        return;
      }
      setPlaidMaskedBank({
        bankName: result.display.bankName,
        routingDisplay: result.display.routingDisplay,
        accountDisplay: result.display.accountDisplay,
      });
      setPlaidBankLinkComplete(true);
      setError(null);
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) =>
  {
    e.preventDefault();
    setError(null);

    if (
      paymentMethod === "greenbutton" &&
      greenBankEntryMode === "plaid" &&
      (!plaidBankLinkComplete || !greenPlaidPayorId)
    ) {
      setError("Complete Plaid bank linking before placing your order.");
      return;
    }

    if (
      paymentMethod === "greenbutton" &&
      greenBankEntryMode === "manual" &&
      greenPaymentData.accountNumber !== greenPaymentData.confirmAccountNumber
    ) {
      setError("Bank account numbers do not match.");
      return;
    }

    startTransition(async () =>
    {
      const createOrderAction = requireSharedUiAdapter(
        orderActions.createOrder,
        "orderActions.createOrder"
      );
      const result = await createOrderAction({
        items: cartItems,
        subtotal: discountedSubtotal,
        cartSubtotal: subtotal,
        totalUnits,
        saveProfile: isLoggedIn && saveProfile,
        referralCode: appliedReferral?.code,
        paymentMethod,
        greenAccountName: greenPaymentData.accountName,
        greenRoutingNumber: greenPaymentData.routingNumber,
        greenAccountNumber: greenPaymentData.accountNumber,
        greenBankName: greenPaymentData.bankName,
        greenPayorId:
          paymentMethod === "greenbutton" &&
            greenBankEntryMode === "plaid" &&
            greenPlaidPayorId
            ? greenPlaidPayorId
            : undefined,
        billingSameAsShipping,
        ...formData,
      });

      if (result.success) {
        clearCart();
        router.push(
          `/checkout/thank-you?orderId=${result.orderId}&orderNumber=${result.orderNumber}&orderAmount=${result.totalAmount.toFixed(
            2
          )}&paymentMethod=${paymentMethod}`
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
                      Apply a partner code to unlock a first-order discount. We
                      match the phone and shipping address you entered above so
                      each first-time discount applies only once per phone or
                      ship-to address.
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

              <div className="rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
                <h2 className="text-xl font-semibold text-white">
                  Payment Method
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Complete checkout with manual payment (Zelle, Cash App, or
                  Venmo).{" "}
                  <span className="text-zinc-500">
                    Green.Money™ eCheck is optional if you prefer to pay from
                    your bank during checkout.
                  </span>
                </p>
                <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-stretch">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("manual")}
                    className={`rounded-2xl border p-5 text-left transition lg:min-w-0 lg:flex-1 ${paymentMethod === "manual"
                      ? "border-purple-400/70 bg-purple-500/10 shadow-[0_10px_35px_rgba(147,51,234,0.18)]"
                      : "border-purple-900/40 bg-black/40 hover:border-purple-500/60"
                      }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/90">
                      Recommended
                    </span>
                    <span className="mt-2 block text-xl font-semibold text-white">
                      Manual payment
                    </span>
                    <span className="mt-2 block text-sm text-zinc-300">
                      Place the order first, then pay manually on the next
                      screen using Zelle, Cash App, or Venmo.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("greenbutton")}
                    className={`rounded-2xl border p-4 text-left transition lg:w-72 lg:shrink-0 ${paymentMethod === "greenbutton"
                      ? "border-emerald-400/70 bg-emerald-500/10 shadow-[0_10px_35px_rgba(16,185,129,0.18)]"
                      : "border-purple-900/40 bg-black/40 hover:border-purple-500/60"
                      }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Optional
                    </span>
                    <span className="mt-2 block text-lg font-semibold text-white">
                      <span className="text-emerald-400">Green</span>.Money™
                    </span>
                    <span className="mt-2 block text-sm text-zinc-400">
                      eCheck with bank details or Plaid during checkout.
                    </span>
                  </button>
                </div>
                <p className="mt-4 text-xs text-zinc-400">
                  {paymentMethod === "greenbutton"
                    ? (
                        <>
                          <span className="text-emerald-400">Green</span>.Money™
                          {" will process the eCheck during checkout."}
                        </>
                      )
                    : "Manual payment instructions appear after the order is placed."}
                </p>
              </div>

              {paymentMethod === "greenbutton" && (
                <div className="rounded-3xl border border-emerald-900/60 bg-linear-to-br from-[#06110d] via-[#07110f] to-black p-6 sm:p-8 shadow-[0_25px_70px_rgba(16,185,129,0.12)]">
                  <h2 className="text-xl font-semibold text-white">
                    Bank Account Details
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {greenBankEntryMode === "plaid" && plaidLinkingAvailable
                      ? (
                          <>
                            Link your bank through Green's Plaid flow, confirm
                            the masked account Green returns, then place your order.
                            You can switch to manual entry anytime.
                          </>
                        )
                      : (
                          <>
                            These details are sent securely to{" "}
                            <span className="text-emerald-400">Green</span>.Money™
                            from the server and are not stored in your order record.
                          </>
                        )}
                  </p>

                  {plaidLinkingAvailable && (
                    <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-emerald-900/40 bg-black/30 p-1">
                      <button
                        type="button"
                        onClick={() =>
                        {
                          setGreenBankEntryMode("plaid");
                          setError(null);
                        }}
                        className={`min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${greenBankEntryMode === "plaid"
                          ? "bg-emerald-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
                          : "text-emerald-100/80 hover:bg-black/40 hover:text-white"
                          }`}
                      >
                        Plaid bank link
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                        {
                          setGreenBankEntryMode("manual");
                          setError(null);
                          resetPlaidLinkingState();
                        }}
                        className={`min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${greenBankEntryMode === "manual"
                          ? "bg-emerald-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
                          : "text-emerald-100/80 hover:bg-black/40 hover:text-white"
                          }`}
                      >
                        Manual bank entry
                      </button>
                    </div>
                  )}

                  {plaidLinkingAvailable && greenBankEntryMode === "plaid" && (
                    <div className="mt-6 space-y-4">
                      <p className="text-sm text-zinc-400">
                        Create a secure Green payor for this checkout, finish Plaid in
                        the frame, then we load your obfuscated routing and account
                        numbers from Green so you can confirm before paying.
                      </p>
                      {!greenPlaidPayorId
                        ? (
                            <button
                              type="button"
                              onClick={handlePrepareGreenPlaid}
                              disabled={isPreparingPlaid}
                              className="w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900/50 sm:w-auto"
                            >
                              {isPreparingPlaid ? "Preparing…" : "Prepare bank linking"}
                            </button>
                          )
                        : (
                            <>
                              <GreenPlaidIframe
                                clientId={
                                  greenPlaidMerchantClientId ??
                                  greenMidForPlaidIframe
                                }
                                payorId={greenPlaidPayorId}
                                onExit={() => setError(null)}
                                onSuccess={() =>
                                {
                                  setError(null);
                                  syncPlaidLinkedBank();
                                }}
                                onError={(data) =>
                                {
                                  const message =
                                    typeof data === "string"
                                      ? data
                                      : data &&
                                        typeof data === "object" &&
                                        "message" in data &&
                                        typeof (data as { message?: string }).message ===
                                        "string"
                                        ? (data as { message: string }).message
                                        : "Plaid reported an error while linking your bank.";
                                  setError(message);
                                }}
                              />
                              {isSyncingPlaidBank && (
                                <p className="text-sm text-emerald-200">
                                  Confirming your bank with Green…
                                </p>
                              )}
                            </>
                          )}
                      {plaidMaskedBank && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-zinc-200">
                          <p className="font-semibold text-emerald-100">
                            Bank on file (masked)
                          </p>
                          <ul className="mt-2 list-none space-y-1 font-mono text-xs sm:text-sm">
                            <li>
                              <span className="text-zinc-500">Bank: </span>
                              {plaidMaskedBank.bankName || "—"}
                            </li>
                            <li>
                              <span className="text-zinc-500">Routing: </span>
                              {plaidMaskedBank.routingDisplay}
                            </li>
                            <li>
                              <span className="text-zinc-500">Account: </span>
                              {plaidMaskedBank.accountDisplay}
                            </li>
                          </ul>
                          {plaidBankLinkComplete && (
                            <p className="mt-3 text-sm text-green-300">
                              You can place your order — Green has a linked account for
                              this checkout session.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {(!plaidLinkingAvailable || greenBankEntryMode === "manual") && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label
                          htmlFor="greenAccountName"
                          className="mb-2 block text-sm font-medium text-emerald-200"
                        >
                          Name on Bank Account *
                        </label>
                        <input
                          type="text"
                          id="greenAccountName"
                          name="accountName"
                          required
                          value={greenPaymentData.accountName}
                          onChange={handleGreenPaymentChange}
                          className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="greenBankName"
                          className="mb-2 block text-sm font-medium text-emerald-200"
                        >
                          Bank Name *
                        </label>
                        <input
                          type="text"
                          id="greenBankName"
                          name="bankName"
                          required
                          value={greenPaymentData.bankName}
                          onChange={handleGreenPaymentChange}
                          className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                          placeholder="Chase"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="greenRoutingNumber"
                            className="mb-2 block text-sm font-medium text-emerald-200"
                          >
                            Routing Number *
                          </label>
                          <input
                            type="text"
                            id="greenRoutingNumber"
                            name="routingNumber"
                            required
                            inputMode="numeric"
                            autoComplete="off"
                            value={greenPaymentData.routingNumber}
                            onChange={handleGreenPaymentChange}
                            className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                            placeholder="123456789"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="greenAccountNumber"
                            className="mb-2 block text-sm font-medium text-emerald-200"
                          >
                            Account Number *
                          </label>
                          <input
                            type="password"
                            id="greenAccountNumber"
                            name="accountNumber"
                            required
                            inputMode="numeric"
                            autoComplete="off"
                            value={greenPaymentData.accountNumber}
                            onChange={handleGreenPaymentChange}
                            className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                            placeholder="Account number"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="greenConfirmAccountNumber"
                          className="mb-2 block text-sm font-medium text-emerald-200"
                        >
                          Confirm Account Number *
                        </label>
                        <input
                          type="password"
                          id="greenConfirmAccountNumber"
                          name="confirmAccountNumber"
                          required
                          inputMode="numeric"
                          autoComplete="off"
                          value={greenPaymentData.confirmAccountNumber}
                          onChange={handleGreenPaymentChange}
                          className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                          placeholder="Re-enter account number"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-8 rounded-2xl border border-emerald-900/40 bg-black/40 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                          Billing Address
                        </h3>
                        <p className="mt-2 text-sm text-zinc-400">
                          <span className="text-emerald-400">Green</span>.Money™
                          {" may require the billing address tied to your bank account."}

                        </p>
                      </div>
                    </div>

                    <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border border-emerald-900/40 bg-black/60 text-emerald-500 focus:ring-emerald-400"
                        checked={billingSameAsShipping}
                        onChange={(event) =>
                          setBillingSameAsShipping(event.target.checked)
                        }
                      />
                      Billing address is the same as shipping
                    </label>

                    {!billingSameAsShipping && (
                      <div className="mt-6 space-y-4">
                        <div>
                          <label
                            htmlFor="billingStreet"
                            className="mb-2 block text-sm font-medium text-emerald-200"
                          >
                            Street Address *
                          </label>
                          <input
                            type="text"
                            id="billingStreet"
                            name="billingStreet"
                            required={!billingSameAsShipping}
                            value={formData.billingStreet}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="billingCity"
                              className="mb-2 block text-sm font-medium text-emerald-200"
                            >
                              City *
                            </label>
                            <input
                              type="text"
                              id="billingCity"
                              name="billingCity"
                              required={!billingSameAsShipping}
                              value={formData.billingCity}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                              placeholder="Los Angeles"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="billingState"
                              className="mb-2 block text-sm font-medium text-emerald-200"
                            >
                              State *
                            </label>
                            <input
                              type="text"
                              id="billingState"
                              name="billingState"
                              required={!billingSameAsShipping}
                              value={formData.billingState}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                              placeholder="CA"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="billingZipCode"
                              className="mb-2 block text-sm font-medium text-emerald-200"
                            >
                              ZIP Code *
                            </label>
                            <input
                              type="text"
                              id="billingZipCode"
                              name="billingZipCode"
                              required={!billingSameAsShipping}
                              value={formData.billingZipCode}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                              placeholder="90001"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="billingCountry"
                              className="mb-2 block text-sm font-medium text-emerald-200"
                            >
                              Country *
                            </label>
                            <input
                              type="text"
                              id="billingCountry"
                              name="billingCountry"
                              required={!billingSameAsShipping}
                              value={formData.billingCountry}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-emerald-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-black"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                {isPending
                  ? paymentMethod === "greenbutton"
                    ? "Processing Bank Payment..."
                    : "Submitting Order..."
                  : paymentMethod === "greenbutton"
                    ? (
                        <>
                          Place Order & Pay with{" "}
                          <span className="text-emerald-300">Green</span>.Money™
                        </>
                      )
                    : "Place Order (Pay Manually)"}
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

