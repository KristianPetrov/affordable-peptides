import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavBar } from "@/components";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { safeAdminCallback } from "@/lib/auth-security";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = safeAdminCallback(params.callbackUrl);
  if (session?.user?.id) redirect(session.user.role === "ADMIN" ? callbackUrl : "/account");

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
        <AdminLoginForm callbackUrl={callbackUrl} />
      </main>
    </div>
  );
}
