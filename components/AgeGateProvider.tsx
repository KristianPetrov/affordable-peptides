import type { ReactNode } from "react";

import { cookies } from "next/headers";

import type { AgeGateStatus } from "@/app/actions/age";
import { AGE_VERIFICATION_COOKIE, submitAgeVerification } from "@/app/actions/age";
import { AgeGate } from "@/components/AgeGate";

type AgeGateProviderProps = {
  children: ReactNode;
};

async function deriveInitialStatus(): Promise<AgeGateStatus> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(AGE_VERIFICATION_COOKIE)?.value;

  if (stored === "approved") {
    return "approved";
  }

  return "unknown";
}

export async function AgeGateProvider({ children }: AgeGateProviderProps) {
  const initialStatus = await deriveInitialStatus();

  return (
    <>
      <AgeGate initialStatus={initialStatus} action={submitAgeVerification} />
      {children}
    </>
  );
}



