# PayRam card-to-crypto operations

The storefront integration is intentionally disabled until the business-specific
card-on-ramp questions and controlled mainnet verification are complete. PayRam
says merchants can activate Cards in its dashboard without a formal merchant
approval process. The checks below are this storefront's launch policy, not a
PayRam dashboard approval status.

Decision on 2026-09-27: the owner authorized a DigitalOcean PayRam Droplet
with weekly backups at up to $30/month. The current quote is $28.80/month
before taxes or other usage. Use existing Neon PostgreSQL rather than adding a
DigitalOcean database. Card checkout remains disabled until the on-ramp
catalog, fee, and payment-verification launch gates below are complete.

Provisioned on 2026-09-27: DigitalOcean Droplet `payram-affordable-peptides`,
ID `604185206`, NYC1, Ubuntu 24.04, public IPv4 `68.183.30.71`. Weekly
automated backups are enabled (first window Wednesday 4:00–8:00 AM UTC), and
the free monitoring agent is enabled. SSH public-key access was verified from
the owner's Mac; the private key remains on that computer.

Installed PayRam `3.8.2` in mainnet mode on 2026-09-28. The direct Neon
connection was accepted, and the public health endpoint reports `status=ok`
and `db=ok`. PayRam generated its AES key and stores it with mode 600 in the
server's `/root/.payraminfo/config.env`; no credential or AES key is stored in
this repository. The Neon app password was rotated after a one-time terminal
echo during setup; the replacement was entered directly into the server's
protected configuration.

The owner added `pay.affordablepeptides.life` → `68.183.30.71` in the separate
Vercel DNS account. The hostname now resolves to the Droplet. Let's Encrypt
issued the HTTPS certificate on 2026-09-28, expiring 2026-12-27; Certbot's
automatic renewal is enabled and was tested successfully. DigitalOcean Cloud
Firewall `payram-affordable-peptides-web` is attached with inbound TCP 22, 80,
and 443 allowed from all IPv4 and IPv6 sources; other inbound traffic is
blocked. SSH password authentication is disabled and public-key authentication
is enabled. Ubuntu UFW remains inactive. Narrow SSH to a stable administrator
IP when one is available.

The PayRam health response listed `redis-server` as `FATAL` even though the
Redis process was running and `redis-cli ping` returned `PONG`; confirm the
service-status mismatch with PayRam before processing live transactions.
The operator account has created the `Affordable Holdings` project. A dashboard
view showed an `EVM Deposit Wallet 1`; PayRam derives customer deposit wallets
from the merchant master account, so this generated address is expected to be
different from the master address. The exact master registration, cold-wallet
destination, deployed sweep contract, SmartSweep configuration, project API
key, webhook, and card-on-ramp activation still need to be verified in the
project. The dashboard previously showed a Tron sync warning; verify Base sync
health specifically before testing this Base-only integration. Storefront
card/crypto checkout remains disabled. Back up the server AES key to secure
offline storage before creating or importing any hot-wallet key.

Provisioned on 2026-09-28 in the existing Neon `affordable peptides` project:
the production branch now has a dedicated `payram` database owned by
`payram_app`. Existing `neondb` and `neondb_owner` were left unchanged. Neon
generated the `payram_app` password, which is stored only in PayRam's protected
server configuration. PayRam's connection test succeeded and its health check
reports the database as `ok`; the credential is not stored in this repository.

## Provisioning record and remaining setup

1. **Pending:** ask PayRam which routed card on-ramp will serve US customers and whether
   its terms permit the public Affordable Peptides catalog. Obtain written
   fee, dispute, and refund terms. PayRam's Cards switch can be activated
   without merchant KYB, but that switch does not guarantee individual card
   purchases or this storefront's 8% fee ceiling.
2. **Completed:** the approved DigitalOcean configuration is Ubuntu 24.04, Basic Shared CPU,
   2 vCPU, 4 GB RAM, 80 GB SSD, 4 TB transfer, weekly backups, and free
   monitoring. On 2026-09-27 this was quoted at $24/month for the Droplet plus
   $4.80/month for weekly backups, or $28.80/month before taxes or other usage.
   DigitalOcean managed PostgreSQL is omitted because the storefront already
   uses Neon; adding the DigitalOcean database would cost another $15/month.
3. **Completed:** a dedicated PayRam database and role, `payram` / `payram_app`,
   were created on the existing Neon production branch.
   PayRam is using Neon's direct (non-pooler) endpoint and its connection test
   succeeded. Its current `POSTGRES_SSLMODE` is `prefer`; set it to `require`
   during a safe container reconfiguration. The storefront's `DATABASE_URL`
   points at a pooled connection and must not be reused as PayRam's credential.
   Check Neon compute capacity, scale-to-zero behavior, backup/restore, and
   the shared-failure impact on both the storefront and gateway.
4. **Completed:** the PayRam Droplet, weekly backups, monitoring, DNS, HTTPS,
   and Cloud Firewall are configured. The account's operator created the
   `Affordable Holdings` project. **Pending:** confirm exact master/cold-wallet
   registration, SmartSweep contract and destination, Base sync health, and
   narrow SSH to administrator IPs.
5. **In progress:** the storefront integration is on a Vercel preview branch.
   Add the project API key and URL to Preview-only Vercel settings, apply the
   database migration to an isolated preview database, and register the
   authenticated preview webhook. Keep checkout disabled while setting those
   up. The local repo is not linked to Vercel CLI; GitHub pushes trigger the
   existing Vercel project integration.
6. **Pending:** run controlled verification below. Enable storefront card
   checkout only after every launch gate is satisfied.

## Production architecture

- Deploy PayRam to a dedicated DigitalOcean droplet using the official PayRam
  image for DigitalOcean PostgreSQL, or a standard Ubuntu image and the
  official installer for Neon. PayRam documents 2 vCPU, 4 GB RAM, and 50 GB
  SSD as the minimum; size above that when monitoring shows pressure.
- Use `pay.affordablepeptides.life` as the dedicated payment subdomain. Serve
  only HTTPS to customers and redirect port 80 to 443.
- Use a dedicated external PostgreSQL database and role. For DigitalOcean
  Managed PostgreSQL, restrict trusted sources to the PayRam droplet/private
  network. For Neon, use the direct endpoint and TLS, keep PayRam credentials
  separate from the storefront, and monitor the shared compute if both use
  the same Neon project.
- Permit public inbound traffic only on 80/443. Restrict SSH to named
  administrator IPs, use SSH keys, disable password login, and enable
  automatic security updates. Current Cloud Firewall also allows SSH from all
  addresses until an administrator IP can be pinned.
- Enable weekly droplet backups and confirm the selected database provider's
  backups/PITR. Run and document a restore test before launch and at least
  quarterly.
- Store PayRam's production AES key and database credentials in the
  infrastructure secret store. Preserve the same AES key across updates.
- Enable DigitalOcean CPU, memory, disk, and availability alerts. Add an
  external HTTPS uptime check for the payment subdomain, container restart
  alerts, database connection alerts, and log retention.

References:

- [DigitalOcean 1-Click](https://docs.payram.com/deployment-guide/digitalocean-1-click)
- [Advanced setup](https://docs.payram.com/deployment-guide/advanced-setup)
- [PayRam updates](https://docs.payram.com/script/script-usage)

## Storefront card launch policy

`PAYRAM_PROVIDER_QUALIFIED` is an internal storefront setting, not a PayRam
approval status. Do not set any launch gate to `true` until written answers
cover:

1. The production storefront domain and payment subdomain.
2. The complete public RUO product catalog and public US customer access.
3. US debit and credit card coverage, KYC requirements, transaction limits,
   fees, dispute liability, and refund responsibility.
4. The prior Stripe termination.
5. The identity and relevant terms of the actual routed on-ramp, plus PayRam's
   written answer about this storefront's intended use.
6. A checkout-level guarantee that combined transaction fees shown before card
   authorization cannot exceed 8% of the order total.

The documented PayRam create/status APIs do not expose a pre-authorization fee
quote. `PAYRAM_FEE_CAP_ENFORCED=true` is therefore an operational attestation:
set it only after the selected on-ramp confirms that the hosted checkout
enforces the ceiling. If that cannot be confirmed, leave checkout disabled.

## Wallet and PayRam project setup

The current operator login manages the merchant project named
`Affordable Holdings`. The storefront uses a project-specific API key; never
put the operator's login credentials or root-account secrets in Vercel. A
PayRam operator role does not configure a personal fee share in this code. All
settlement and SmartSweep destinations must be approved and controlled by
Affordable Peptides.

The intended public addresses supplied for this project are:

- Master wallet: `0x3078001d833e9bd14cd37087f497dc4fe7c86db8`
- Cold/treasury wallet: `0x1A6a6Fd81Fb266c90d1A005d25Fd837672b115A1`

Verify both against the `Affordable Holdings` PayRam project before setting
the Vercel environment variables. Keep them distinct. The EVM deposit wallet
shown in PayRam is a derived customer-payment address, not a replacement for
the master or cold wallet. Never copy a private key or seed phrase into this
repository, Vercel, or the storefront database.

1. Create separate test and production PayRam projects/API keys if supported
   by the account setup; do not reuse the operator login as the API key.
2. Enable only Base and native USDC for this storefront's payment links. The
   integration requests `currency=USDC` and `network=BASE` and reviews any
   settlement that does not match those values.
3. Confirm the native Base USDC contract:
   `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
4. Confirm the master wallet is registered, deploy the Base sweep contract,
   and configure PayRam SmartSweep to the cold/treasury wallet with documented amount,
   address-count, and time thresholds.
5. Register the webhook:
   `https://www.affordablepeptides.life/api/payments/payram/webhook`.
6. Generate a project-specific API key. Store it only as the sensitive
   `PAYRAM_API_KEY` server secret. PayRam authenticates webhook requests with
   the `API-Key` header using that project key.
7. Keep new storefront checkout gated off until the deployment environment,
   catalog/provider terms, fee ceiling, card activation, and controlled payment
   verification have all been checked. The public PayRam dashboard's card
   toggle alone does not satisfy the storefront launch gates.

References:

- [Wallet integration](https://docs.payram.com/onboarding-guide/wallet-integration)
- [SmartSweep](https://docs.payram.com/features/smartsweep)
- [Supported assets and networks](https://docs.payram.com/support/supported-networks-and-coins)

## Storefront deployment

1. Apply `drizzle/0012_payram_card_crypto_checkout.sql`.
2. Configure the variables listed in `docs/payram-environment.example`.
   In Vercel, use Preview-only variables for preview testing and Production
   variables only after the owner has approved a production rollout. Never
   place the operator's account password, private key, or seed phrase in these
   variables.
3. Set a long random `CRON_SECRET`; the five-minute Vercel cron calls
   `/api/cron/payram-reconcile`.
   Vercel runs cron jobs only on production deployments, so this Preview branch
   will not exercise scheduled reconciliation. The owner confirmed the Vercel
   team is on Pro (2026-09-28), which supports this five-minute schedule after
   production deployment. See [Vercel Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
4. Keep every launch flag `false` on Preview by default. PayRam has no
   simulated card settlement: `PAYRAM_MAINNET_TEST_MODE=true` allows real
   mainnet card and crypto transactions. The app now permits that flag only on
   Vercel Preview, with an isolated staging database and a separate PayRam
   project/key; it restricts checkout and payment-status access to signed-in
   storefront administrators. The PayRam operator role does not grant
   storefront admin access. A user must authorize any real card test.
5. Confirm the PayRam checkout URL returned by the API uses exactly
   `PAYRAM_CHECKOUT_ORIGIN`.
6. Confirm the PayRam webhook's `API-Key` header is checked before its payload
   is parsed or persisted. The raw body is hashed only for duplicate-event
   detection; PayRam documents the project API key as webhook authentication.
7. Confirm the admin shows the deposit transaction separately from the
   SmartSweep treasury transaction.

## Verification sequence

### Automated / testnet

- Run `pnpm test`, `pnpm lint`, and `pnpm build`.
- Exercise duplicate order submissions with the same idempotency key.
- Exercise forged API keys, exact replays, out-of-order events, incorrect
  invoice/customer associations, amounts, token contracts, assets, networks,
  destination addresses, partial payments, overpayments, and late payment after
  cancellation.
- Interrupt PayRam create/status calls and verify the order shows
  `RECONCILING` without creating another attempt.
- Disable webhook delivery and verify the five-minute reconciliation job
  catches the update.
- Fail Resend delivery and verify the durable outbox retries without duplicate
  confirmation emails.
- Restart the app between each mutation and confirm inventory and payment state
  remain single-application.
- Test guest token denial, signed-in ownership, manual checkout, mobile status
  polling, manual refund records, and SmartSweep records.

PayRam testnet can validate Sepolia stablecoin deposits, but card purchases
require mainnet. This integration requires native USDC on Base, so its full
settlement path is not compatible with PayRam's documented Sepolia testnet
flow. Testnet does not validate the real card purchase.

### Controlled mainnet

1. After card-onramp approval and owner authorization, use an access-protected
   Preview deployment with an isolated staging database and a separate PayRam
   project/API key. These are real mainnet transactions. Set
   `PAYRAM_MAINNET_TEST_MODE=true`, `PAYRAM_CARD_CRYPTO_ENABLED=true`, and the
   provider qualification and fee-cap gates to `true`; leave
   `PAYRAM_MAINNET_VERIFIED=false`. In this mode, the checkout option and
   payment-status access are limited to signed-in administrators.
2. Perform controlled debit and credit purchases as an administrator.
3. Confirm KYC, disclosed final fees at or below 8%, wallet funding, the final
   merchant-payment step, full USDC settlement on Base, and fulfillment release.
4. Confirm SmartSweep reaches the separate treasury address and record both
   transaction hashes.
5. Send and record a manual USDC refund to an independently verified recipient
   address. Never derive the refund destination from the deposit sender.
6. After staging verification, disable test mode. Set
   `PAYRAM_MAINNET_VERIFIED=true` and enable `PAYRAM_CARD_CRYPTO_ENABLED=true`
   only in the intended production deployment.

## Monitoring

Alert on:

- PayRam HTTPS or container downtime.
- PayRam/managed-Postgres CPU, memory, disk, connection, and backup failures.
- `RECONCILIATION_REQUIRED` or `REVIEW_REQUIRED` attempts.
- Attempts open longer than the expected checkout window.
- Partial, excess, late, asset/network/address-mismatch payments.
- Webhook API-key failures and repeated status API failures.
- Confirmation email outbox failures.
- SmartSweep deposits without a corresponding confirmed treasury transfer.
- Checkout starts, hosted-checkout completion, declines, fee observations, and
  abandonment between wallet funding and merchant payment.

## Rollback

Set only `PAYRAM_CARD_CRYPTO_ENABLED=false` and redeploy. Do not remove the
PayRam API key, webhook, cron, database tables, or payment server: existing
attempts must continue receiving webhooks and reconciling. Keep manual payment
methods available. After all open attempts are settled, expired, or reviewed,
cards may also be disabled on the PayRam project.
