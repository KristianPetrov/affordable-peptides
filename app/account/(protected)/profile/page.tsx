import { auth } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/db";
import { PasswordChangeForm, ProfileForm } from "@ap/shared-ui";

export default async function AccountProfilePage ()
{
  const session = await auth();

  if (!session) {
    return null;
  }

  const profile = await getCustomerProfile(session.user.id);

  return (
    <div className="space-y-6">
      <section className="theme-card-gradient rounded-3xl p-6">
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

      <section className="theme-card-gradient rounded-3xl p-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-purple-200">
            Security
          </p>
          <h2 className="text-3xl font-semibold text-white">Change Password</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Update your password to keep your account secure.
          </p>
        </div>
        <PasswordChangeForm />
      </section>
    </div>
  );
}

