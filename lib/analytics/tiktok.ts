"use client";

export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

type TikTokEventProps = Record<string, unknown>;

function getTtq ()
{
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.ttq;
}

export function tiktokPageView ()
{
  const ttq = getTtq();
  ttq?.page?.();
}

export function tiktokTrack (event: string, props: TikTokEventProps = {})
{
  const ttq = getTtq();
  ttq?.track?.(event, props);
}

export function createTikTokEventBase ()
{
  const event_id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    event_id,
    timestamp: Math.floor(Date.now() / 1000),
    url: typeof window !== "undefined" ? window.location.href : undefined,
  } satisfies TikTokEventProps;
}




