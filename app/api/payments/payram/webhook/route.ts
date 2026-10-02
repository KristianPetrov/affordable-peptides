import { after, NextRequest, NextResponse } from "next/server";

import { processEmailOutbox } from "@/lib/email-outbox";
import { getPayRamOperationalConfig } from "@/lib/payram/config";
import {
  finishPayRamEvent,
  persistPayRamEvent,
} from "@/lib/payram/repository";
import {
  reconcilePayRamAttempt,
  resolvePayRamWebhookAttempt,
} from "@/lib/payram/service";
import {
  authenticatePayRamWebhook,
  hashRawBody,
} from "@/lib/payram/security";
import { parsePayRamWebhookPayload } from "@/lib/payram/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_WEBHOOK_BYTES = 64 * 1024;

async function readBoundedBody(request: NextRequest): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    size += value.byteLength;
    if (size > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("INVALID_UTF8");
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let config;
  try {
    config = getPayRamOperationalConfig();
  } catch {
    return NextResponse.json(
      { error: "Payment reconciliation is not configured." },
      { status: 503 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedBody(request);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYLOAD_TOO_LARGE") {
      return NextResponse.json(
        { error: "Payload too large." },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: "Invalid UTF-8 payload." }, { status: 400 });
  }

  // Authenticate before parsing or persisting anything from the body.
  const authentication = authenticatePayRamWebhook({
    rawBody,
    signatureHeader: request.headers.get("x-payram-signature"),
    apiKeyHeader: request.headers.get("api-key"),
    apiKey: config.apiKey,
    requireSignature:
      process.env.PAYRAM_WEBHOOK_REQUIRE_SIGNATURE?.trim().toLowerCase() ===
      "true",
  });
  if (!authentication.ok) {
    return NextResponse.json({ error: authentication.reason }, { status: 401 });
  }

  let payload;
  try {
    payload = parsePayRamWebhookPayload(JSON.parse(rawBody));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid webhook payload.",
      },
      { status: 400 }
    );
  }

  let attempt = null;
  let resolutionError: unknown = null;
  try {
    attempt = await resolvePayRamWebhookAttempt(payload);
  } catch (error) {
    resolutionError = error;
  }

  const event = await persistPayRamEvent({
    rawBodyHash: hashRawBody(rawBody),
    payload,
    attemptId: attempt?.id,
  });

  if (resolutionError) {
    await finishPayRamEvent(event.id, {
      success: false,
      error: resolutionError,
    });
    return NextResponse.json(
      { received: true, reviewRequired: true },
      { status: 202 }
    );
  }

  if (!attempt) {
    await finishPayRamEvent(event.id, {
      success: false,
      error: new Error("No payment attempt matches this PayRam event."),
    });
    return NextResponse.json(
      { received: true, unmatched: true },
      { status: 202 }
    );
  }

  after(async () => {
    try {
      const result = await reconcilePayRamAttempt(attempt, payload);
      await finishPayRamEvent(event.id, { success: true, result });
      await processEmailOutbox(5);
    } catch (error) {
      await finishPayRamEvent(event.id, { success: false, error });
      console.error("PayRam webhook reconciliation failed:", error);
    }
  });

  return NextResponse.json(
    {
      received: true,
      duplicate: !event.created,
      queued: true,
    },
    { status: 202 }
  );
}
