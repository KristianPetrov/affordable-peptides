import { CheckoutClient, NavBar } from "@/components";
import { auth } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/db";
import {
  isPayRamCheckoutEnabled,
  canUsePayRamCheckout,
} from "@/lib/payram/config";

export default async function CheckoutPage() {
  const session = await auth();
  const profile = session?.user
    ? await getCustomerProfile(session.user.id)
    : null;
  const cardCryptoEnabled =
    isPayRamCheckoutEnabled() &&
    canUsePayRamCheckout(session?.user);

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <NavBar />
      <CheckoutClient
        profile={profile}
        sessionUser={session?.user ?? null}
        cardCryptoEnabled={cardCryptoEnabled}
      />
    </div>
  );
}
