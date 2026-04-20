import { CheckoutClient, NavBar } from "@ap/shared-ui";
import { auth } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/db";

export default async function CheckoutPage() {
  const session = await auth();
  const profile = session?.user
    ? await getCustomerProfile(session.user.id)
    : null;

  const greenMoneyPlaidClientId =
    process.env.GREEN_CLIENT_ID?.trim() ||
    process.env.GREEN_API_CLIENT_ID?.trim() ||
    null;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <CheckoutClient
        profile={profile}
        sessionUser={session?.user ?? null}
        greenMoneyPlaidClientId={greenMoneyPlaidClientId}
      />
    </div>
  );
}

