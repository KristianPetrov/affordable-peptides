# Admin security

Admin login requires a password plus an authenticator code (TOTP). Every account
with the ADMIN role must enroll, including admins signing in through the customer
login or calling the credentials endpoint directly.

## First login

1. Open /admin/login, enter the admin email and password, and choose
   “First time? Set up your authenticator”.
2. Enter the 8-digit code sent to that admin email address. Setup expires after
   10 minutes and allows five guesses per stage.
3. Scan the QR code with an authenticator app, then confirm a 6-digit code.
4. Download and privately store the ten recovery codes before continuing.

After enrollment, sign in with the password and an authenticator code. A recovery
code can replace the authenticator code once. Each recovery code is removed when
used. Email verification cannot disable or replace an enrolled authenticator.

If the authenticator and all recovery codes are lost, a trusted operator must
verify the account owner independently before clearing that user's
admin_second_factors row in the database. Clearing the row invalidates existing
admin sessions. Do not restore a previously deleted row: re-enroll instead.

## Deployment

Apply drizzle/0013_admin_two_factor.sql before serving this release. It adds two
tables without changing existing customer or order records. The migration is
idempotent and has been tested on a PostgreSQL engine.

With an explicitly authorized production environment file:

    node --env-file=.env.production.local --import tsx scripts/migrate-admin-mfa.ts

This script applies only the security migration in one transaction and verifies
both tables. The ordinary Drizzle migration journal also includes this migration
for new databases.

AUTH_SECRET (or NEXTAUTH_SECRET) must contain at least 32 characters.
ADMIN_EMAIL and ADMIN_PASSWORD must be explicitly configured; there are no
fallback admin credentials. Password inputs are capped at bcrypt's 72-byte limit.
RESEND_API_KEY and RESEND_FROM_EMAIL support the initial email possession check.
Preview deployments cannot send enrollment emails.

Authenticator secrets are encrypted using AES-256-GCM, a key derived from
AUTH_SECRET, and the user ID as authenticated data. Keep AUTH_SECRET private and
stable: rotating it invalidates sessions and requires resetting/re-enrolling MFA
records. Recovery codes and setup tokens are stored only as keyed hashes.

Rate limiting uses atomic database counters shared by all server instances.
Login allows 10 attempts per account and 30 per IP in 15 minutes. Setup email
delivery allows three requests per admin in 15 minutes. Counters fail closed if
storage is unavailable. Vercel's trusted forwarded-IP header supplies the IP.

Password-only admin sessions from earlier releases are rejected. Admin sessions
expire four hours after second-factor verification; refreshes do not extend that
deadline. Removing an admin role or MFA record revokes that account's sessions.
Concurrent requests cannot reuse a TOTP time step, enrollment token, or recovery
code.

Do not roll back to the password-only login release after unpausing production.
If authentication or customer flows fail, pause the project and fix forward.
