# Order System Setup Guide

This manual payment order system allows customers to place orders and pay offline. Orders are stored locally and can be managed through an admin panel.

## Features

- ✅ Customer checkout form (name, phone, shipping address)
- ✅ Order storage in JSON database (`/data/orders.json`)
- ✅ Email + SMS notifications (configurable)
- ✅ Thank you page with payment instructions
- ✅ Admin panel for order management
- ✅ Order status tracking (PENDING_PAYMENT → PAID → SHIPPED)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Admin password for accessing /admin page
ADMIN_PASSWORD=your-secure-password-here

# Email address to receive order notifications
ADMIN_EMAIL=your-email@example.com

# Optional: Email-to-SMS gateway for instant text alerts
# Example: 5551234567@txt.att.net
ADMIN_SMS_EMAIL=your-sms-gateway@example.com
```

### 2. Email Configuration (Optional)

The system currently logs order emails to the console. To enable actual email sending:

**Option A: Using Resend (Recommended)**

1. Install Resend:
```bash
npm install resend
```

2. Get your API key from [resend.com](https://resend.com)

3. Add to `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

4. Update `lib/email.ts` to use Resend (see commented code in the file)

**Option B: Using Nodemailer**

1. Install nodemailer:
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

2. Configure SMTP settings in `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

3. Update `lib/email.ts` to use Nodemailer

**Option C: Using SendGrid**

1. Install SendGrid:
```bash
npm install @sendgrid/mail
```

2. Add to `.env.local`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

3. Update `lib/email.ts` to use SendGrid

### 3. SMS Alerts (Optional)

Set `ADMIN_SMS_EMAIL` to your carrier's Email-to-SMS gateway (e.g., `5551234567@vtext.com`). When an order is placed the system sends a condensed text summary to that address in addition to the full email.

> Tip: Most carriers publish their gateway domains (AT&T: `txt.att.net`, Verizon: `vtext.com`, T-Mobile: `tmomail.net`, etc.).

### 4. Database

Orders are stored in `/data/orders.json`. This directory is automatically created on first order.

**Note:** For production, consider migrating to a proper database:
- PostgreSQL with Prisma
- MongoDB
- Supabase
- Vercel Postgres

### 5. Phone Number

Update the phone number in:
- `app/checkout/thank-you/page.tsx` (line 9)
- `app/page.tsx` (contact section)

## Usage

### Customer Flow

1. Customer adds products to cart
2. Clicks "Place Order (Pay Manually)" button in cart
3. Fills out checkout form
4. Submits order → redirected to thank you page
5. Receives Order ID (e.g., AP-12345-678)
6. Sends payment via CashApp/Zelle/etc.
7. Texts payment confirmation with Order ID

### Admin Flow

1. Access `/admin?password=your-password`
2. View all orders with status counts
3. Update order status:
   - PENDING_PAYMENT → Waiting for payment
   - PAID → Payment received
   - SHIPPED → Order shipped
   - CANCELLED → Order cancelled
4. Add optional notes when updating status

## Order Status Flow

```
PENDING_PAYMENT → PAID → SHIPPED
                    ↓
                CANCELLED
```

## File Structure

```
lib/
  ├── orders.ts      # Order types and utilities
  ├── db.ts          # Database operations (JSON file)
  └── email.ts       # Email formatting + SMS summaries

app/
  ├── checkout/
  │   ├── page.tsx           # Checkout form
  │   ├── thank-you/
  │   │   └── page.tsx       # Thank you page
  │   └── layout.tsx         # Route-level wrapper (no providers)
  ├── admin/
  │   └── page.tsx           # Admin order management
  └── api/
      └── orders/
          └── route.ts        # Order creation API
```

## Security Notes

- Admin page uses simple password protection via query parameter
- For production, implement proper authentication (NextAuth.js, etc.)
- Consider rate limiting on order API endpoint
- Validate and sanitize all user inputs
- Use HTTPS in production

## Customization

### Payment Methods

Update the thank you page (`app/checkout/thank-you/page.tsx`) to list your preferred payment methods:

- CashApp
- Zelle
- Venmo
- Bank Transfer
- etc.

### Order Number Format

Modify `generateOrderNumber()` in `lib/orders.ts` to change the format.

### Email Template

Customize the email template in `lib/email.ts` to match your branding.

## Troubleshooting

**Orders not saving?**
- Check that `/data` directory is writable
- Check server logs for errors

**Emails not sending?**
- Check console logs (emails are logged by default)
- Verify email service credentials
- Check spam folder

**Admin page not accessible?**
- Verify ADMIN_PASSWORD matches query parameter
- Check environment variables are loaded

## Next Steps

1. Set up email service (Resend/SendGrid/Nodemailer)
2. Configure ADMIN_PASSWORD, ADMIN_EMAIL, and optional ADMIN_SMS_EMAIL
3. Test order flow end-to-end
4. Customize payment instructions
5. Set up proper authentication for admin panel
6. Consider migrating to a real database for production


