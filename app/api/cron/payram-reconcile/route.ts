import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { processEmailOutbox } from "@/lib/email-outbox";
import { reconcileOutstandingPayRamAttempts } from "@/lib/payram/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [reconciliation, email] = await Promise.all([
      reconcileOutstandingPayRamAttempts(),
      processEmailOutbox(20),
    ]);
    return NextResponse.json({ ok: true, reconciliation, email });
  } catch (error) {
    console.error("PayRam reconciliation cron failed:", error);
    return NextResponse.json(
      { error: "Reconciliation failed." },
      { status: 500 }
    );
  }
}
