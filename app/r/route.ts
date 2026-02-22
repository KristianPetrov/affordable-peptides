import { NextRequest, NextResponse } from "next/server";

const ALLOWED_REDIRECT_HOSTS = new Set([
  "www.ups.com",
  "tools.usps.com",
  "cash.app",
  "venmo.com",
]);

export async function GET (request: NextRequest): Promise<NextResponse>
{
  const destination = request.nextUrl.searchParams.get("to");

  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  try {
    const parsed = new URL(destination);

    if (
      parsed.protocol !== "https:" ||
      !ALLOWED_REDIRECT_HOSTS.has(parsed.hostname)
    ) {
      return NextResponse.redirect(new URL("/", request.url), { status: 302 });
    }

    return NextResponse.redirect(parsed.toString(), { status: 302 });
  } catch {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }
}
