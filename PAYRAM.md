# PayRam checkout

This replaces the old `PAYRAM_RUNBOOK.md`, which had card payments and wallet
access wrong. Everything below was checked against PayRam's official docs on
2026-09-30; links are at the end of each section.

- Store: `https://www.affordablepeptides.life` (Vercel, Next.js)
- Payment server: `https://pay.affordablepeptides.life` (self-hosted PayRam
  on a DigitalOcean droplet, database on Neon)
- Customers pay: debit/credit card, Apple Pay, Google Pay, or bank through
  PayRam's card onramp, or USDC on Base directly from any wallet
- You receive: USDC on Base, swept automatically to your own cold wallet

## How a payment works

1. The customer picks **Debit / credit card** at checkout and places the order.
   The store reserves stock, creates the order as `PENDING_PAYMENT`, and asks
   PayRam for a payment link (`POST /api/v1/payment`, locked to USDC on Base,
   expiring after 24 hours).
2. The customer is sent to the PayRam payment page on
   `pay.affordablepeptides.life`. They either choose **Cards** or pay USDC on
   Base from their own wallet.
3. **Cards:** PayRam creates a self-custody PayRam Wallet for the customer from
   their email. On their first purchase they do a one-time ID check with the
   onramp partner. Their card buys crypto into that wallet, and the wallet then
   pays our deposit address.
4. PayRam posts a webhook to the store. The store never trusts the webhook
   body: it re-reads the payment from PayRam's status API, checks the invoice,
   order, amount, asset (USDC), network (Base), and token contract, and only
   then marks the order `PAID` and queues the confirmation email.
5. SmartSweep moves the USDC from the deposit address to your cold wallet.

A cron job (`/api/cron/payram-reconcile`, every 5 minutes) re-checks any open
payment, so a missed webhook only delays an order; it never loses one.

## What PayRam does and does not do

**Card payments**

- Cards are supported through PayRam's Card-to-Crypto Onramp. You turn it on in
  the PayRam dashboard under **Settings → Payment Channels → Cards →
  Activate**. It is on by default for every project once activated.
- You do **not** need merchant KYC/KYB to enable it.
- Customers **do** complete a one-time KYC check on their first card purchase.
- PayRam adds no fee. The onramp partner charges its own fee to the customer,
  shown on the payment page. There is no way for the store to cap or preview
  that fee through the API, so the store does not promise a fee limit.
- Settlement network depends on the onramp route: PayRam Wallet settles on
  Base, Wert on Ethereum/Base/Polygon, Changelly on Ethereum. This store only
  accepts Base, so Base must be enabled in PayRam.
- There is no card sandbox. Card tests are real charges.

**Wallets and access to funds**

- PayRam never stores your private keys. The dashboard does not hold or let you
  spend your money.
- Your **master wallet** is only used to derive customer deposit addresses and
  to deploy the sweep contract. It needs a little ETH on Base for gas.
- Each customer pays into a **deposit address** derived from the master wallet.
  The "EVM Deposit Wallet 1" in the dashboard is one of these; it is expected
  to differ from the master address.
- SmartSweep moves deposits to your **cold wallet** on the thresholds you set.
  You access your money by opening that cold wallet (for example in MetaMask or
  a hardware wallet), not through PayRam. The cold wallet must be a different
  wallet from the master.
- The customer's PayRam Wallet belongs to the customer. You have no access to
  it, and it cannot be used for refunds.

Sources: [Card-to-Crypto Onramp](https://docs.payram.com/features/card-to-crypto-fiat-onramp),
[Wallet integration](https://docs.payram.com/onboarding-guide/wallet-integration),
[SmartSweep](https://docs.payram.com/features/smartsweep),
[Create payment](https://docs.payram.com/api-integration/payments-api/create-payment),
[Payment status](https://docs.payram.com/api-integration/payments-api/payment-status),
[Webhook](https://docs.payram.com/api-integration/payments-api/webhook).

## Setup checklist (your hands)

Nothing here can be done from the code. Do them in order.

### 1. Payment server (droplet)

- [ ] Update PayRam to the latest release (see [PayRam updates](https://docs.payram.com/script/script-usage)).
      Newer releases sign webhooks with `X-Payram-Signature`; the store accepts
      either that or the older `API-Key` header.
- [ ] Back up the PayRam AES key from `/root/.payraminfo/config.env` to secure
      offline storage. Keep the same key across updates.
- [ ] Set `POSTGRES_SSLMODE=require` for PayRam's Neon connection.
- [ ] Restrict SSH in the DigitalOcean Cloud Firewall to your own IP.
- [ ] Confirm `https://pay.affordablepeptides.life` loads with a valid
      certificate and the PayRam health check shows everything `ok` (the old
      notes saw Redis reported as `FATAL`; ask PayRam support if it still does).

### 2. PayRam dashboard (project "Affordable Holdings")

- [ ] **Settings → Site URL** is `https://pay.affordablepeptides.life`.
- [ ] **Wallet Management → Deposit Wallet → EVM → Base**: connect the master
      wallet `0x3078001d833e9bd14cd37087f497dc4fe7c86db8`, enter the cold wallet
      `0x1A6a6Fd81Fb266c90d1A005d25Fd837672b115A1`, and deploy the sweep
      contract (needs ETH on Base in the master wallet).
- [ ] Make sure Base sync is healthy and USDC on Base is enabled.
- [ ] Configure SmartSweep thresholds (amount, address count, or time).
- [ ] **Settings → Payment Channels → Cards → Activate**, and confirm it is on
      for this project.
- [ ] **Settings → Webhook**: add
      `https://www.affordablepeptides.life/api/payments/payram/webhook`.
      Use the exact host the site serves without a redirect; a redirect can
      drop the POST.
- [ ] Create a project API key. Copy it straight into Vercel (next step). Do not
      use your dashboard login anywhere in the store.

### 3. Database

- [ ] Apply the migration to the store's production database:
      `DATABASE_URL=<production url> pnpm db:migrate`
      (adds `drizzle/0012_payram_card_crypto_checkout.sql`).

### 4. Vercel environment variables (Production)

| Variable | Value |
| --- | --- |
| `PAYRAM_BASE_URL` | `https://pay.affordablepeptides.life` |
| `PAYRAM_API_KEY` | project API key from step 2, marked Sensitive |
| `PAYRAM_CARD_CRYPTO_ENABLED` | `true` |
| `PAYRAM_ADMIN_ONLY` | `true` for testing, then remove or `false` |
| `PAYRAM_TESTER_EMAILS` | store account emails allowed to test while admin-only is on (optional) |
| `PAYRAM_TREASURY_WALLET_ADDRESS` | `0x1A6a6Fd81Fb266c90d1A005d25Fd837672b115A1` (optional) |
| `CRON_SECRET` | long random string |

`docs/payram-environment.example` lists every variable, including optional
ones. Delete these old variables if they exist; nothing reads them anymore:
`PAYRAM_PROVIDER_QUALIFIED`, `PAYRAM_FEE_CAP_ENFORCED`,
`PAYRAM_MAINNET_VERIFIED`, `PAYRAM_MAX_FEE_BPS`,
`PAYRAM_MASTER_WALLET_ADDRESS`. `PAYRAM_MAINNET_TEST_MODE` still works as an
alias for `PAYRAM_ADMIN_ONLY`, but rename it.

The 5-minute cron in `vercel.json` needs a Vercel Pro plan (you are on Pro) and
only runs on the production deployment.

### 5. Test on the live site, then open it up

With `PAYRAM_ADMIN_ONLY=true`, only signed-in storefront admins, plus any
account listed in `PAYRAM_TESTER_EMAILS` (comma-separated), see the card
option. To let a client run the test, have them create a store account and add
its email to `PAYRAM_TESTER_EMAILS`. They must be signed in when they check out.

- [ ] Signed in as an admin or tester, place a small order with **Debit / credit card**.
- [ ] On the PayRam page, confirm the **Cards** option appears. The store locks
      each payment to USDC on Base; if Cards is missing on that page, tell the
      developer, because PayRam's docs don't say whether the onramp honours that
      lock.
- [ ] Pay with a real card. Do the ID check, fund the wallet, and confirm the
      payment to the merchant.
- [ ] Within a few minutes the order shows `PAID` in `/admin` and the
      confirmation email arrives.
- [ ] Place a second small order and pay with USDC on Base from your own
      wallet.
- [ ] Confirm SmartSweep delivers both payments to the cold wallet.
- [ ] Set `PAYRAM_ADMIN_ONLY=false` (or delete it) and redeploy. Card checkout
      is now public.

## Environment variables the code reads

- `PAYRAM_CARD_CRYPTO_ENABLED` must be `true`, `PAYRAM_BASE_URL` must be an
  HTTPS origin with no path, and `PAYRAM_API_KEY` must be set, or the card
  option is hidden and the server refuses new card orders.
- Existing payments keep reconciling whenever `PAYRAM_BASE_URL` and
  `PAYRAM_API_KEY` are set, even if checkout is switched off.
- `PAYRAM_WEBHOOK_REQUIRE_SIGNATURE=true` rejects webhooks that lack a valid
  `X-Payram-Signature`. Turn it on after you see signed webhooks arriving.

## Payment states

The admin panel shows each PayRam attempt under its order.

| State | Meaning | What to do |
| --- | --- | --- |
| `OPEN` | Link created, nothing paid yet | Nothing |
| `CONFIRMING` | Payment seen on-chain, waiting for confirmations | Nothing |
| `PARTIALLY_FILLED` | Customer paid less than the total | Customer can finish on the same link |
| `FILLED` | Paid in full, order marked `PAID` | Ship |
| `OVER_FILLED` | Paid more than the total, order marked `PAID`, flagged `EXCESS_PAYMENT` | Ship, then refund the excess |
| `CANCELLED` | Link expired (24 hours) | Customer can start a new link from the status page |
| `RECONCILIATION_REQUIRED` | PayRam timed out while creating the link | Cron retries; if no link was created, use "resolve timeout" in admin |
| `REVIEW_REQUIRED` | A check failed (wrong asset, network, amount, or order) or payment arrived after the order was cancelled | Look at the review reason and the PayRam dashboard before shipping |

Orders are never marked paid from a webhook alone. A FILLED payment with a
sub-cent rounding difference is accepted; anything below the total is not.

## Refunds

PayRam has no card refund. Refunds are sent manually as USDC on Base from your
cold wallet to an address the customer confirms with support. Never send a
refund to the address the payment came from: for card payments that is the
customer's PayRam Wallet or an onramp address, not somewhere they control
directly. Record each refund in the admin panel with its transaction hash.

## Turning it off

Set `PAYRAM_CARD_CRYPTO_ENABLED=false` and redeploy. Leave the API key,
webhook, cron, and payment server running so payments already in progress
still complete. Manual payment (Zelle) stays available throughout.

## Monitoring

- Uptime check on `https://pay.affordablepeptides.life`.
- DigitalOcean CPU, memory, and disk alerts on the droplet.
- Weekly droplet backups (enabled) and Neon backups for the `payram` database.
- In `/admin`, any attempt in `REVIEW_REQUIRED` or `RECONCILIATION_REQUIRED`.
- SmartSweep: deposits that never reach the cold wallet.
