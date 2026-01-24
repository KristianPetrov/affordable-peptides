"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { resetPasswordWithTokenAction } from "@/app/actions/customers";

type ResetPasswordFormProps = {
  token?: string | null;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    if (!token) {
      setStatus("error");
      setMessage("Missing reset token. Please request a new reset link.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordWithTokenAction({
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (!result.success) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage("Password reset successfully. You can sign in now.");
      setFormData({ newPassword: "", confirmPassword: "" });
      router.refresh();
    });
  };

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
        <h1 className="mb-2 text-2xl font-semibold text-white">
          Reset password
        </h1>
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          This reset link is missing a token. Please request a new one.
        </div>
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link
            href="/account/forgot-password"
            className="text-purple-200 underline decoration-dotted underline-offset-4 hover:text-purple-100"
          >
            Request a new reset link
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
      <h1 className="mb-2 text-2xl font-semibold text-white">
        Choose a new password
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Password must be at least 8 characters long.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            required
            minLength={8}
            value={formData.newPassword}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                newPassword: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="********"
            autoComplete="new-password"
          />
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
            required
            minLength={8}
            value={formData.confirmPassword}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                confirmPassword: event.target.value,
              }))
            }
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="********"
            autoComplete="new-password"
          />
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
          {isPending ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {status === "success" && (
        <p className="mt-6 text-center text-sm text-zinc-400">
          <Link
            href="/account/login"
            className="text-purple-200 underline decoration-dotted underline-offset-4 hover:text-purple-100"
          >
            Go to sign in
          </Link>
          .
        </p>
      )}
    </div>
  );
}

