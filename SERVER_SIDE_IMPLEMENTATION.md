# Server-Side Implementation Guide

This project uses **Next.js 16** with modern server-side features including **Server Actions** and **Server Components**.

## Architecture Overview

### Server Actions (`app/actions/`)

All server-side mutations use Server Actions instead of API routes:

- ✅ **`app/actions/orders.ts`** - Order creation with validation
- ✅ **`app/actions/admin.ts`** - Order status updates

**Benefits:**
- Type-safe server-side functions
- Automatic form handling
- Built-in error handling
- No need for manual API route setup
- Better performance (runs on server)

### Server Components

- ✅ **`app/admin/page.tsx`** - Server Component that fetches orders server-side
- ✅ **`app/checkout/layout.tsx`** - Server Component wrapper

### Client Components (Only when needed)

- ✅ **`app/checkout/page.tsx`** - Needs client-side form state
- ✅ **`app/checkout/thank-you/page.tsx`** - Needs `useSearchParams`

## Key Features

### 1. Server Actions with Validation

```typescript
// app/actions/orders.ts
"use server";

export async function createOrderAction(input: CreateOrderInput) {
  // All validation happens server-side
  // Input sanitization
  // Business logic
  // Database operations
}
```

### 2. useTransition for Optimistic Updates

```typescript
// Client component uses useTransition
const [isPending, startTransition] = useTransition();

startTransition(async () => {
  const result = await createOrderAction(data);
  // Handle result
});
```

### 3. revalidatePath for Cache Updates

```typescript
// Server Actions automatically revalidate paths
revalidatePath("/admin"); // Updates admin page after order creation
```

### 4. Server-Side Email Sending

```typescript
// lib/email.ts
export async function sendOrderEmail(order: Order) {
  // Runs entirely on server
  // Uses Resend API (server-side only)
  // Environment variables accessed server-side
}
```

## Environment Variables

All environment variables are accessed **server-side only**:

```env
# Server-side only (never exposed to client)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=orders@affordablepeptides.life
ADMIN_EMAIL=your-email@example.com
ADMIN_SMS_EMAIL=5551234567@txt.att.net # optional email-to-SMS gateway
ADMIN_PASSWORD=your-secure-password
```

If `ADMIN_SMS_EMAIL` is set, `sendOrderEmail()` automatically sends a condensed text summary through your carrier's Email-to-SMS gateway alongside the full HTML email.

## Security Best Practices

1. ✅ **Server Actions** - All mutations run server-side
2. ✅ **Input Validation** - Validated on server before processing
3. ✅ **Input Sanitization** - All strings trimmed and validated
4. ✅ **Type Safety** - TypeScript ensures type safety
5. ✅ **Error Handling** - Proper error handling without exposing internals

## File Structure

```
app/
  ├── actions/              # Server Actions (server-side only)
  │   ├── orders.ts        # Order creation
  │   └── admin.ts         # Admin operations
  ├── api/                  # API routes (deprecated, kept for compatibility)
  │   └── orders/
  │       └── route.ts     # Wraps Server Action
  ├── checkout/             # Checkout flow
  │   ├── page.tsx         # Client Component (form state)
  │   ├── thank-you/       # Client Component (searchParams)
  │   └── layout.tsx       # Server Component wrapper
  └── admin/                # Admin panel
      └── page.tsx          # Server Component (data fetching)

lib/
  ├── db.ts                # Server-side database operations
  ├── email.ts             # Server-side email sending
  └── orders.ts            # Type definitions
```

## Migration from API Routes

The old API route (`/api/orders`) is kept for backwards compatibility but now wraps the Server Action:

```typescript
// app/api/orders/route.ts
export async function POST(request: NextRequest) {
  const result = await createOrderAction(body);
  // Returns same format as before
}
```

**Recommendation:** Use Server Actions directly in new code.

## Performance Benefits

1. **No Client-Side JavaScript** for server operations
2. **Smaller Bundle Size** - Server Actions don't ship to client
3. **Better SEO** - Server Components render on server
4. **Faster Initial Load** - Data fetched server-side
5. **Automatic Caching** - Next.js handles caching automatically

## Testing Server Actions

Server Actions can be tested directly:

```typescript
import { createOrderAction } from "@/app/actions/orders";

const result = await createOrderAction({
  items: [...],
  // ... other fields
});

expect(result.success).toBe(true);
```

## Next Steps

1. ✅ Server Actions implemented
2. ✅ Server Components for data fetching
3. ✅ Client Components only where needed
4. ✅ Proper error handling
5. ✅ Type safety throughout
6. ✅ Environment variables server-side only

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React useTransition](https://react.dev/reference/react/useTransition)

