# NextAuth Setup Guide

This project uses NextAuth v5 (Auth.js) for authentication with Next.js 16 App Router.

## Setup Steps

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# NextAuth Configuration
AUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32
# Or use NEXTAUTH_SECRET (both work)

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password-here
```

**Important:** Generate a secure `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 2. Database Migration

Run the database migration to create the auth tables:

```bash
pnpm db:push
```

This will create the following tables:
- `users` - User accounts
- `accounts` - OAuth account connections
- `sessions` - User sessions
- `verification_tokens` - Email verification tokens

### 3. Access Admin Page

1. Navigate to `/admin/login`
2. Enter your admin credentials (from `ADMIN_EMAIL` and `ADMIN_PASSWORD`)
3. You'll be redirected to `/admin` after successful login

## Features

- **Credentials Provider**: Email/password authentication
- **Session Management**: JWT-based sessions
- **Route Protection**: Middleware protects `/admin/*` routes
- **Auto User Creation**: Admin user is created automatically on first login
- **Secure Password Hashing**: Uses bcryptjs for password hashing

## File Structure

- `lib/auth.ts` - NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` - Auth API route handler
- `middleware.ts` - Route protection middleware
- `app/admin/login/page.tsx` - Login page
- `app/admin/page.tsx` - Protected admin page
- `lib/db/schema.ts` - Database schema (includes auth tables)
- `types/next-auth.d.ts` - TypeScript type definitions

## Usage

### Server Components

```typescript
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return <div>Protected content</div>;
}
```

### Server Actions

```typescript
import { auth } from "@/lib/auth";

export async function myAction() {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Your action logic
}
```

### Sign Out

```typescript
import { signOut } from "@/lib/auth";

await signOut({ redirectTo: "/admin/login" });
```

## Security Notes

- Always set strong `ADMIN_EMAIL` and `ADMIN_PASSWORD` in production
- Use a strong `AUTH_SECRET` (at least 32 characters)
- Never commit `.env` file to version control
- The admin user is automatically created on first login with the credentials from environment variables

