import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import { db } from "@/lib/db";
import
  {
    users,
    accounts,
    sessions,
    verificationTokens,
  } from "@/lib/db/schema";

export type UserRole = "ADMIN" | "CUSTOMER";

const rawAdminEmail = process.env.ADMIN_EMAIL?.trim();
const rawAdminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME?.trim() || "Admin";

const adminEmail = rawAdminEmail && rawAdminEmail.length > 0
  ? rawAdminEmail
  : "admin@example.com";
const adminPassword = rawAdminPassword && rawAdminPassword.length > 0
  ? rawAdminPassword
  : "admin123";
const normalizedAdminEmail = adminEmail.toLowerCase();
const usingDefaultAdminCredentials =
  !rawAdminEmail || !rawAdminPassword || rawAdminPassword.length === 0;

if (usingDefaultAdminCredentials) {
  console.warn(
    "[auth] ADMIN_EMAIL or ADMIN_PASSWORD is not set. Using insecure default credentials."
  );
}

async function findUserByEmail (email: string)
{
  const normalized = email.toLowerCase();

  const [normalizedMatch] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  if (normalizedMatch) {
    return normalizedMatch;
  }

  if (normalized !== email) {
    const [originalMatch] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (originalMatch) {
      return originalMatch;
    }
  }

  return null;
}

async function ensureAdminUser (password: string)
{
  const existingUser = await findUserByEmail(adminEmail);

  if (existingUser) {
    if (!existingUser.password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      const [updated] = await db
        .update(users)
        .set({
          password: hashedPassword,
          name: existingUser.name ?? adminName,
          role: "ADMIN",
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      return updated;
    }

    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const [created] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      email: normalizedAdminEmail,
      name: adminName,
      password: hashedPassword,
      role: "ADMIN",
    })
    .returning();

  return created;
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize (credentials)
      {
        const emailInput = String(credentials?.email).trim();
        const passwordInput = String(credentials?.password);

        if (!emailInput || !passwordInput) {
          return null;
        }

        const normalizedEmail = emailInput.toLowerCase();
        const isAdminLogin = normalizedEmail === normalizedAdminEmail;

        if (isAdminLogin) {
          if (passwordInput !== adminPassword) {
            return null;
          }

          const adminUser = await ensureAdminUser(adminPassword);

          return {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name ?? adminName,
            role: adminUser.role ?? "ADMIN",
          };
        }

        const user = await findUserByEmail(emailInput);

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          passwordInput,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role ?? "CUSTOMER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt ({ token, user })
    {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as { role?: UserRole }).role ?? token.role;
      }

      return token;
    },
    async session ({ session, token })
    {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.email =
          (token.email as string) ?? session.user.email ?? "";
        session.user.role =
          (token.role as UserRole) ?? session.user.role ?? "CUSTOMER";
      }

      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

