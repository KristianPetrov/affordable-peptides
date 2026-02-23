import { redirect } from "next/navigation";

import { AccountLoginForm, NavBar } from "@ap/shared-ui";
import { auth } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function AccountLoginPage({
  searchParams,
}: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;

  if (session) {
    redirect(params.callbackUrl || "/account");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <AccountLoginForm callbackUrl={params.callbackUrl} />
      </main>
    </div>
  );
}

