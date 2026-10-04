"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { beginAdminMfaSetup, verifyAdminSetupEmail, confirmAdminAuthenticator } from "@/app/actions/admin-mfa";

export function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"login" | "email" | "authenticator" | "recovery">("login");
  const [setup, setSetup] = useState<{ secret: string; qrCode: string }>();
  const [recovery, setRecovery] = useState<{ codes: string[]; token: string }>();
  const inputClass = "w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400";
  const buttonClass = "w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50";

  function run(action: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try { await action(); } catch { setError("Unable to complete this request. Please try again."); }
    });
  }

  async function login(enrollmentToken?: string) {
    const result = await signIn("credentials", { email, password, code, enrollmentToken, redirect: false });
    if (!result || result.error) {
      setError("Sign-in failed. Check your email, password and code. After too many attempts, wait 15 minutes.");
      return;
    }
    setPassword("");
    setCode("");
    setRecovery(undefined);
    setSetup(undefined);
    router.replace(callbackUrl);
    router.refresh();
  }

  function downloadRecoveryCodes() {
    if (!recovery) return;
    const blob = new Blob(["Affordable Peptides admin recovery codes\nKeep these private. Each code can be used only once.\n\n" + recovery.codes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "affordable-peptides-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8">
      <h1 className="mb-3 text-2xl font-semibold text-white">Admin Login</h1>
      <p className="mb-6 text-sm text-zinc-400">
        {stage === "login" && "Sign in with your password and an authenticator code or a recovery code."}
        {stage === "email" && "Enter the 8-digit setup code sent to your admin email. It expires in 10 minutes."}
        {stage === "authenticator" && "Scan this QR code in Google Authenticator, 1Password, or another authenticator app. Then enter its 6-digit code."}
        {stage === "recovery" && "Your authenticator is ready. Save these recovery codes somewhere private. Each works once if you lose access to your authenticator."}
      </p>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      {stage === "login" && (
        <form onSubmit={event => { event.preventDefault(); run(() => login()); }} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-2 block text-sm text-purple-200">Email</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm text-purple-200">Password</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="admin-code" className="mb-2 block text-sm text-purple-200">Authenticator or recovery code</label>
            <input id="admin-code" name="code" type="text" autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={64} value={code} onChange={event => setCode(event.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={pending || !code.trim()} className={buttonClass}>{pending ? "Signing in…" : "Sign In"}</button>
          <button type="button" disabled={pending || !email || !password} onClick={() => run(async () => {
            const result = await beginAdminMfaSetup(email, password);
            if (result.error) { setError(result.error); return; }
            setCode(""); setStage("email");
          })} className="w-full text-sm text-purple-200 underline disabled:opacity-50">First time? Set up your authenticator</button>
        </form>
      )}
      {(stage === "email" || stage === "authenticator") && (
        <form onSubmit={event => { event.preventDefault(); run(async () => {
          if (stage === "email") {
            const result = await verifyAdminSetupEmail(code);
            if (result.error || !result.secret || !result.qrCode) { setError(result.error || "Unable to verify code."); return; }
            setSetup({ secret: result.secret, qrCode: result.qrCode }); setCode(""); setStage("authenticator");
          } else {
            const result = await confirmAdminAuthenticator(code);
            if (result.error || !result.recoveryCodes || !result.enrollmentToken) { setError(result.error || "Unable to verify code."); return; }
            setRecovery({ codes: result.recoveryCodes, token: result.enrollmentToken }); setSetup(undefined); setCode(""); setStage("recovery");
          }
        }); }} className="space-y-4">
          {stage === "authenticator" && setup && (
            <div className="space-y-3">
              {/* QR is generated locally on the server; no third-party service receives the secret. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setup.qrCode} width={240} height={240} alt="Scan to add your admin authenticator" className="mx-auto rounded-lg" />
              <p className="text-xs text-zinc-400">Or enter this setup key manually:</p>
              <code className="block break-all rounded-lg bg-black/60 p-3 text-sm text-purple-100">{setup.secret}</code>
            </div>
          )}
          <label htmlFor="setup-code" className="block text-sm text-purple-200">{stage === "email" ? "Email setup code" : "Authenticator code"}</label>
          <input id="setup-code" inputMode="numeric" autoComplete="one-time-code" required pattern={stage === "email" ? "[0-9]{8}" : "[0-9]{6}"} maxLength={stage === "email" ? 8 : 6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} className={inputClass} />
          <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Verifying…" : "Verify Code"}</button>
          <button type="button" disabled={pending} onClick={() => { setSetup(undefined); setCode(""); setStage("login"); setError(""); }} className="w-full text-sm text-purple-200 underline">Restart setup</button>
        </form>
      )}
      {stage === "recovery" && recovery && (
        <div className="space-y-4">
          <ul className="grid grid-cols-1 gap-2 rounded-xl bg-black/60 p-4 text-center font-mono text-sm text-purple-100">
            {recovery.codes.map(value => <li key={value}>{value}</li>)}
          </ul>
          <button type="button" onClick={downloadRecoveryCodes} className="w-full text-sm text-purple-200 underline">Download recovery codes</button>
          <button type="button" disabled={pending} onClick={() => run(() => login(recovery.token))} className={buttonClass}>{pending ? "Signing in…" : "I saved my codes — continue"}</button>
        </div>
      )}
    </div>
  );
}
