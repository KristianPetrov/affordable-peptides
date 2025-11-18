import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Get admin credentials from environment
        const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

        // Check if credentials match admin
        if (
          credentials.email === adminEmail &&
          credentials.password === adminPassword
        ) {
          // Check if user exists in database, if not create one
          const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, adminEmail))
            .limit(1);

          if (existingUser) {
            return {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name || "Admin",
            };
          }

          // Create admin user if doesn't exist
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          const [newUser] = await db
            .insert(users)
            .values({
              id: randomUUID(),
              email: adminEmail,
              name: "Admin",
              password: hashedPassword,
            })
            .returning();

          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name || "Admin",
          };
        }

        // For database users, check password hash
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (user && user.password) {
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (isValid) {
            return {
              id: user.id,
              email: user.email,
              name: user.name || undefined,
            };
          }
        }

        return null;
      },
    }),
  ],
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});

