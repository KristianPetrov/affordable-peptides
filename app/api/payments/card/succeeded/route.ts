import { NextResponse } from "next/server";

export async function POST ()
{
  return NextResponse.json(
    {
      error:
        "Deprecated: use Stripe webhooks instead (POST /api/stripe/webhook).",
    },
    { status: 410 }
  );
}

