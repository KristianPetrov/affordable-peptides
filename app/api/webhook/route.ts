import { NextResponse } from "next/server";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { applyOrderCommunicationEvent } from "@/lib/db";

type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const resend = new Resend(process.env.RESEND_API_KEY);

function getHeaderOrNull(req: Request, name: string): string | null {
  const value = req.headers.get(name);
  return value && value.length > 0 ? value : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing RESEND_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret is not configured." },
      { status: 500 }
    );
  }

  const payload = await req.text();
  const id = getHeaderOrNull(req, "svix-id");
  const timestamp = getHeaderOrNull(req, "svix-timestamp");
  const signature = getHeaderOrNull(req, "svix-signature");

  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { error: "Missing required Svix headers." },
      { status: 400 }
    );
  }

  let event: ResendWebhookEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    }) as ResendWebhookEvent;
  } catch (error) {
    console.error("Invalid Resend webhook signature", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  console.log("Resend webhook received", {
    type: event.type,
    createdAt: event.created_at ?? event.data?.created_at ?? null,
    emailId: event.data?.email_id ?? null,
  });

  if (event.data?.email_id && event.type) {
    const eventAtRaw = event.created_at ?? event.data?.created_at;
    const eventAt = eventAtRaw ? new Date(eventAtRaw) : undefined;
    const updatedOrder = await applyOrderCommunicationEvent(
      event.data.email_id,
      event.type,
      eventAt && !Number.isNaN(eventAt.getTime()) ? eventAt : undefined
    );

    if (updatedOrder) {
      revalidatePath("/admin");
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}