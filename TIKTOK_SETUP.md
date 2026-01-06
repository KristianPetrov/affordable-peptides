# TikTok Pixel + Conversions API Setup

This project supports:

- **Client Pixel** for page views + light funnel events
- **Server-side Conversions API** for **`CompletePayment`** when an admin marks an order as **PAID**

## Environment variables

Add these to your runtime environment (e.g. `.env.local` locally, and your host's environment variables in production).

### Required

- `NEXT_PUBLIC_TIKTOK_PIXEL_ID`
  - TikTok Pixel ID / Pixel Code
  - **Public**: this is bundled into browser JS (set at build time).

- `TIKTOK_EVENTS_ACCESS_TOKEN`
  - TikTok Events API access token
  - **Private**: server-only. Do **not** prefix with `NEXT_PUBLIC_`.

### Optional

- `TIKTOK_TEST_EVENT_CODE`
  - Used only for TikTok Events Manager “Test Events” verification.

## Order lifecycle (important)

Orders are created as `PENDING_PAYMENT` and only become “paid” when an admin updates the status to `PAID`.

This integration sends the TikTok server-side conversion **only** on that `PENDING_PAYMENT → PAID` transition.












