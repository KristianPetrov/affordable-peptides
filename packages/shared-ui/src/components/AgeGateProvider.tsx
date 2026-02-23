import type { ReactNode } from "react";

import { cookies } from "next/headers";

import type { AgeGateAction, AgeGateStatus } from "@ap/shared-ui/adapters";
import { AgeGate } from "./AgeGate";

type AgeGateProviderProps = {
  children: ReactNode;
  cookieName: string;
  submitAgeVerification: AgeGateAction;
  deriveInitialStatus?: () => Promise<AgeGateStatus>;
};

async function deriveInitialStatusFromCookie(
  cookieName: string
): Promise<AgeGateStatus> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(cookieName)?.value;

  if (stored === "approved") {
    return "approved";
  }

  return "unknown";
}

export async function AgeGateProvider({
  children,
  cookieName,
  submitAgeVerification,
  deriveInitialStatus,
}: AgeGateProviderProps) {
  const initialStatus = deriveInitialStatus
    ? await deriveInitialStatus()
    : await deriveInitialStatusFromCookie(cookieName);

  return (
    <>
      <AgeGate initialStatus={initialStatus} action={submitAgeVerification} />
      {children}
    </>
  );
}



