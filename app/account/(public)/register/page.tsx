import { redirect } from "next/navigation";

import NavBar from "@/components/NavBar";
import { AccountRegisterForm } from "@/components/account/AccountRegisterForm";
import { auth } from "@/lib/auth";

export default async function AccountRegisterPage() {
  const session = await auth();

  if (session) {
    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <AccountRegisterForm />
      </main>
    </div>
  );
}

