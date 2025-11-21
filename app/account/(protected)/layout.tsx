import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { auth, signOut } from "@/lib/auth";

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="w-full rounded-full border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-200 transition hover:border-red-400 hover:text-white"
      >
        Sign Out
      </button>
    </form>
  );
}

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/account/login?callbackUrl=/account");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl gap-6 lg:grid lg:grid-cols-[260px,1fr]">
          <div className="mb-6 rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)] lg:mb-0">
            <AccountSidebar user={session.user} />
            <div className="mt-8">
              <SignOutButton />
            </div>
          </div>
          <div className="space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

