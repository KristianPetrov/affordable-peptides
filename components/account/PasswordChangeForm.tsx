"use client";

import { useState, useTransition } from "react";

import { changePasswordAction } from "@/app/actions/customers";

export function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      const result = await changePasswordAction(formData);

      if (!result.success) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage("Password changed successfully.");
      // Clear form on success
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Current Password
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Enter your current password"
          />
        </div>
        <div>
          <label
            htmlFor="newPassword"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Enter your new password (min. 8 characters)"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Password must be at least 8 characters long.
          </p>
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={8}
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Confirm your new password"
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
        {isPending ? "Changing Password..." : "Change Password"}
      </button>
    </form>
  );
}


