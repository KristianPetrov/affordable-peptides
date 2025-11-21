"use client";

import { useState, useTransition } from "react";

import { updateCustomerProfileAction } from "@/app/actions/customers";
import type { CustomerProfile } from "@/lib/db";

type ProfileFormProps = {
  initialProfile: CustomerProfile | null;
  userEmail: string;
};

const toFormState = (profile: CustomerProfile | null) => ({
  fullName: profile?.fullName ?? "",
  phone: profile?.phone ?? "",
  shippingStreet: profile?.shippingStreet ?? "",
  shippingCity: profile?.shippingCity ?? "",
  shippingState: profile?.shippingState ?? "",
  shippingZipCode: profile?.shippingZipCode ?? "",
  shippingCountry: profile?.shippingCountry ?? "United States",
});

export function ProfileForm({ initialProfile, userEmail }: ProfileFormProps) {
  const [formData, setFormData] = useState(() => toFormState(initialProfile));
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    startTransition(async () => {
      const result = await updateCustomerProfileAction(formData);

      if (!result.success) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage("Profile updated successfully.");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={userEmail}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-purple-900/40 bg-black/30 px-4 py-3 text-white"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Email updates coming soon. Contact support if you need to change it.
          </p>
        </div>
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="(555) 555-5555"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-purple-900/40 bg-black/30 p-4">
        <p className="text-sm font-semibold text-white">Shipping Address</p>
        <input
          type="text"
          name="shippingStreet"
          value={formData.shippingStreet}
          onChange={handleChange}
          placeholder="Street Address"
          className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="shippingCity"
            value={formData.shippingCity}
            onChange={handleChange}
            placeholder="City"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            type="text"
            name="shippingState"
            value={formData.shippingState}
            onChange={handleChange}
            placeholder="State"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="shippingZipCode"
            value={formData.shippingZipCode}
            onChange={handleChange}
            placeholder="ZIP Code"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <input
            type="text"
            name="shippingCountry"
            value={formData.shippingCountry}
            onChange={handleChange}
            placeholder="Country"
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            status === "success"
              ? "border-green-500/40 bg-green-500/10 text-green-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-900/60"
      >
        {isPending ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}

