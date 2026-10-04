import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, adminSecondFactors } from "@/lib/db/schema";
import { ADMIN_MFA_VERSION, isFreshAdminAuthentication } from "@/lib/auth-security";
import { limitLogin, verifyLoginPassword, verifyAdminSecondFactor } from "@/lib/auth-store";

export type UserRole = "ADMIN" | "CUSTOMER";

export const authConfig = {
  trustHost: true,
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  providers: [Credentials({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      code: { label: "Authenticator or recovery code", type: "text" },
      enrollmentToken: { type: "text" },
    },
    async authorize(credentials, request) {
      const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      const code = typeof credentials?.code === "string" ? credentials.code.trim() : "";
      const enrollmentToken = typeof credentials?.enrollmentToken === "string" ? credentials.enrollmentToken : undefined;
      if (!email || email.length > 254 || !password || Buffer.byteLength(password, "utf8") > 72 || code.length > 64) return null;
      try {
        if (!await limitLogin(email, request.headers)) return null;
        const user = await verifyLoginPassword(email, password);
        if (!user) return null;
        const role: UserRole = user.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
        if (role === "ADMIN" && !await verifyAdminSecondFactor(user.id, code, enrollmentToken)) return null;
        return { id: user.id, email: user.email, name: user.name, role, mfaVerifiedAt: role === "ADMIN" ? Date.now() : undefined };
      } catch {
        console.error("[auth] Credential verification unavailable");
        return null;
      }
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.mfaVersion = user.role === "ADMIN" ? ADMIN_MFA_VERSION : undefined;
        token.mfaVerifiedAt = user.mfaVerifiedAt;
      }
      if (token.role === "ADMIN") {
        // Reject password-only sessions issued before this release, and expire
        // admin authentication after four hours regardless of JWT refreshes.
        if (!isFreshAdminAuthentication(token.mfaVersion, token.mfaVerifiedAt) || !token.id) return null;
        try {
          const [admin] = await db.select({ id: users.id }).from(users).innerJoin(adminSecondFactors, eq(users.id, adminSecondFactors.userId)).where(and(eq(users.id, token.id), eq(users.role, "ADMIN"), isNotNull(adminSecondFactors.confirmedAt), lte(adminSecondFactors.confirmedAt, new Date(token.mfaVerifiedAt as number)))).limit(1);
          if (!admin) return null;
        } catch { return null; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.email = token.email ?? "";
        session.user.role = token.role ?? "CUSTOMER";
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
