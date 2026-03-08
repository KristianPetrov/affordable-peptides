import { NavBar, ResetPasswordForm } from "@ap/shared-ui";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <div className="theme-page min-h-screen">
      <NavBar />
      <main className="flex min-h-[60vh] items-center justify-center px-6">
        <ResetPasswordForm token={params.token ?? null} />
      </main>
    </div>
  );
}

