"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  db,
  upsertCustomerProfile,
  type CustomerProfileUpdate,
} from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
};

type ActionResult =
  | { success: true }
  | { success: false; error: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function sanitizeInput(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function isValidPhone(phone?: string | null) {
  if (!phone) {
    return true;
  }

  return /^[\d\s()+-]+$/.test(phone);
}

export async function registerCustomerAction(
  input: RegisterCustomerInput
): Promise<ActionResult> {
  try {
    const name = sanitizeInput(input.name);
    const email = sanitizeInput(input.email);
    const password = input.password?.trim();
    const confirmPassword = input.confirmPassword?.trim();

    if (!email || !password || !confirmPassword || !name) {
      return { success: false, error: "All required fields must be provided." };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long.",
      };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const normalizedEmail = normalizeEmail(email);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: normalizedEmail,
      name,
      password: hashedPassword,
      role: "CUSTOMER",
    });

    const profilePayload: CustomerProfileUpdate = {
      fullName: name,
      phone: sanitizeInput(input.phone),
      shippingStreet: sanitizeInput(input.shippingStreet),
      shippingCity: sanitizeInput(input.shippingCity),
      shippingState: sanitizeInput(input.shippingState),
      shippingZipCode: sanitizeInput(input.shippingZipCode),
      shippingCountry: sanitizeInput(input.shippingCountry),
    };

    const hasProfileData = Object.values(profilePayload).some(
      (value) => value && value.length > 0
    );

    if (hasProfileData) {
      if (!isValidPhone(profilePayload.phone)) {
        return { success: false, error: "Invalid phone number format." };
      }

      await upsertCustomerProfile(userId, profilePayload);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to register customer:", error);
    return {
      success: false,
      error: "Unable to create account. Please try again.",
    };
  }
}

type UpdateCustomerProfileInput = {
  fullName?: string;
  phone?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
};

export async function updateCustomerProfileAction(
  input: UpdateCustomerProfileInput
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session) {
      return { success: false, error: "You need to be signed in." };
    }

    const userId = session.user.id;
    const profileUpdate: CustomerProfileUpdate = {
      fullName: sanitizeInput(input.fullName),
      phone: sanitizeInput(input.phone),
      shippingStreet: sanitizeInput(input.shippingStreet),
      shippingCity: sanitizeInput(input.shippingCity),
      shippingState: sanitizeInput(input.shippingState),
      shippingZipCode: sanitizeInput(input.shippingZipCode),
      shippingCountry: sanitizeInput(input.shippingCountry),
    };

    if (!isValidPhone(profileUpdate.phone)) {
      return { success: false, error: "Invalid phone number format." };
    }

    await upsertCustomerProfile(userId, profileUpdate);

    if (profileUpdate.fullName) {
      await db
        .update(users)
        .set({ name: profileUpdate.fullName, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    revalidatePath("/account");
    revalidatePath("/account/profile");
    revalidatePath("/checkout");

    return { success: true };
  } catch (error) {
    console.error("Failed to update customer profile:", error);
    return {
      success: false,
      error: "Unable to update profile. Please try again.",
    };
  }
}

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session) {
      return { success: false, error: "You need to be signed in." };
    }

    const currentPassword = input.currentPassword?.trim();
    const newPassword = input.newPassword?.trim();
    const confirmPassword = input.confirmPassword?.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: "All password fields are required." };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: "New password must be at least 8 characters long.",
      };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "New passwords do not match." };
    }

    if (currentPassword === newPassword) {
      return {
        success: false,
        error: "New password must be different from your current password.",
      };
    }

    const userId = session.user.id;

    // Get the user's current password hash
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.password) {
      return {
        success: false,
        error: "Unable to verify current password. Please contact support.",
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    // Hash and update the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/account/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to change password:", error);
    return {
      success: false,
      error: "Unable to change password. Please try again.",
    };
  }
}

