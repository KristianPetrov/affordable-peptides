import { CheckoutClient, NavBar } from "@ap/shared-ui";
import { auth } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/db";

export default async function CheckoutPage() {
  const session = await auth();
  const profile = session?.user
    ? await getCustomerProfile(session.user.id)
    : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <CheckoutClient profile={profile} sessionUser={session?.user ?? null} />
    </div>
  );
}

