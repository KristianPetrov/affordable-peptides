import { createHash, randomUUID } from "crypto";

import type { Order } from "@/lib/orders";

type TikTokEventPayload = {
  pixel_code: string;
  event: string;
  event_id: string;
  timestamp: number;
  test_event_code?: string;
  context?: {
    user?: {
      email?: string[];
      phone?: string[];
    };
  };
  properties?: Record<string, unknown>;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function getPixelCode(): string | null {
  const fromPublic = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const fromPrivate = process.env.TIKTOK_PIXEL_ID;
  return (fromPrivate ?? fromPublic ?? "").trim() || null;
}

function getAccessToken(): string | null {
  return (process.env.TIKTOK_EVENTS_ACCESS_TOKEN ?? "").trim() || null;
}

function getTestEventCode(): string | undefined {
  const value = (process.env.TIKTOK_TEST_EVENT_CODE ?? "").trim();
  return value.length > 0 ? value : undefined;
}

async function postTikTokEvent(payload: TikTokEventPayload): Promise<void> {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.2/pixel/track/",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("TikTok Events API request failed:", response.status, text);
      return;
    }

    const json = (await response.json().catch(() => null)) as
      | { code?: number; message?: string }
      | null;

    if (json && typeof json.code === "number" && json.code !== 0) {
      console.error("TikTok Events API error:", json.code, json.message);
    }
  } catch (error) {
    console.error("TikTok Events API exception:", error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTikTokCompletePayment(order: Order): Promise<void> {
  const pixelCode = getPixelCode();
  const accessToken = getAccessToken();
  if (!pixelCode || !accessToken) {
    return;
  }

  const normalizedEmail = normalizeEmail(order.customerEmail);
  const normalizedPhone = normalizePhone(order.customerPhone);

  const emailHash = normalizedEmail ? sha256(normalizedEmail) : null;
  const phoneHash = normalizedPhone ? sha256(normalizedPhone) : null;

  const payload: TikTokEventPayload = {
    pixel_code: pixelCode,
    event: "CompletePayment",
    event_id: `${order.id}-paid-${randomUUID()}`,
    timestamp: Math.floor(Date.now() / 1000),
    test_event_code: getTestEventCode(),
    context: {
      user: {
        email: emailHash ? [emailHash] : undefined,
        phone: phoneHash ? [phoneHash] : undefined,
      },
    },
    properties: {
      order_id: order.id,
      order_number: order.orderNumber,
      value: order.subtotal,
      currency: "USD",
      contents: order.items.map((item) => ({
        content_id: item.productSlug ?? item.productName,
        content_name: item.productName,
        content_type: "product",
        variant: item.variantLabel,
        quantity: item.count,
        price: item.tierPrice,
      })),
    },
  };

  await postTikTokEvent(payload);
}












