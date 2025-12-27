import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import NavBar from "@/components/NavBar";

export default async function LoginPage ({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
})
{
  const session = await auth();
  const params = await searchParams;

  // Redirect if already logged in
  if (session) {
    if (session.user.role === "ADMIN") {
      redirect(params.callbackUrl || "/admin");
    }

    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-purple-900/60 bg-linear-to-br from-[#150022] via-[#090012] to-black p-8 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
          <h1 className="mb-6 text-2xl font-semibold text-white">
            Admin Login
          </h1>
          {params.error === "CredentialsSignin" && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3 text-sm text-red-400">
              Invalid email or password
            </div>
          )}
          <form
            action={async (formData) =>
            {
              "use server";
              const email = formData.get("email");
              const password = formData.get("password");
              const callbackUrl = params.callbackUrl || "/admin";

              const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
              });

              if (result?.error) {
                redirect(`/admin/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
              }

              redirect(callbackUrl);
            }}
            className="space-y-4"
          >
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
                className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-purple-200"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full rounded-xl border border-purple-900/40 bg-black/60 px-4 py-3 text-white placeholder-zinc-500 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Enter password"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-purple-500"
            >
              Sign In
            </button>
          </form>
          <p className="mt-4 text-xs text-zinc-400">
            Page is protected by NextAuth.
          </p>
        </div>
      </main>
    </div>
  );
}

