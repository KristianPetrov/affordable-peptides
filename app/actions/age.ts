

import "server-only";

import { cookies } from "next/headers";

export const AGE_VERIFICATION_COOKIE = "age_verified";

export type AgeGateStatus = "approved" | "denied" | "unknown";

export type AgeGateFormState = {
  status: AgeGateStatus;
  message?: string | null;
};

export type AgeGateAction = (
  prevState: AgeGateFormState,
  formData: FormData
) => Promise<AgeGateFormState>;

const oneMonthInSeconds = 60 * 60 * 24 * 30;

export async function submitAgeVerification(
  _prevState: AgeGateFormState,
  formData: FormData
): Promise<AgeGateFormState> {
  "use server";
  const decision = formData.get("decision");
  const rememberSelection = formData.get("remember");
  const rememberChoice =
    typeof rememberSelection === "string" && rememberSelection.toLowerCase() === "on";
  const cookieStore = await cookies();

  if (decision === "approve") {
    cookieStore.set(AGE_VERIFICATION_COOKIE, "approved", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: rememberChoice ? oneMonthInSeconds : undefined,
    });

    return { status: "approved", message: null };
  }

  cookieStore.delete(AGE_VERIFICATION_COOKIE);

  return {
    status: "denied",
    message: "You must be 18 or older to continue.",
  };
}



