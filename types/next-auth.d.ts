import { type DefaultSession } from "next-auth";
import type { UserRole } from "@/auth.config";
import "next-auth";
import "next-auth/jwt";
import "@auth/core/adapters";

declare module "next-auth" {
  interface Session extends DefaultSession
  {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      name?: string | null;
      role?: UserRole;
    };
  }

  interface User
  {
    id: string;
    email: string;
    name?: string | null;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT
  {
    id?: string;
    email?: string;
    role?: UserRole;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser
  {
    role?: UserRole;
  }
}

