import NavBar from "@/components/NavBar";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <ResetPasswordForm token={params.token ?? null} />
      </main>
    </div>
  );
}

