import { redirect } from "next/navigation";

import { ForgotPasswordForm, NavBar } from "@ap/shared-ui";
import { auth } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const session = await auth();

  if (session) {
    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}

