import { auth } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/db";
import { ProfileForm } from "@/components/account/ProfileForm";

export default async function AccountProfilePage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  const profile = await getCustomerProfile(session.user.id);

  return (
    <section className="rounded-3xl border border-purple-900/60 bg-gradient-to-br from-[#150022] via-[#090012] to-black p-6 shadow-[0_25px_70px_rgba(70,0,110,0.45)]">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
          Profile
        </p>
        <h1 className="text-3xl font-semibold text-white">Saved Details</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Update your default shipping information to speed up future checkouts.
        </p>
      </div>
      <ProfileForm
        initialProfile={profile}
        userEmail={session.user.email}
      />
    </section>
  );
}

