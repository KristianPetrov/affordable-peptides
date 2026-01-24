"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { requestPasswordResetAction } from "@/app/actions/customers";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });

      if (!result.success) {
        setStatus("error");
        setMessage(result.error);
        return;
      }

      setStatus("success");
      setMessage(
        "If an account exists for that email, you’ll receive a password reset link shortly."
      );
    });
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
      <h1 className="mb-2 text-2xl font-semibold text-white">
        Forgot your password?
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Enter your email and we’ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-purple-200"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="you@example.com"
            autoComplete="email"
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
          {isPending ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-400">
        Remembered your password?{" "}
        <Link
          href="/account/login"
          className="text-purple-200 underline decoration-dotted underline-offset-4 hover:text-purple-100"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}

