import { NextRequest, NextResponse } from "next/server";

import {
  getOrderContactsByStatus,
  type OrderContactExportRecord,
  type OrderContactExportStatus,
} from "@/lib/db";
import { auth } from "@/lib/auth";

type ContactSegment = "pending_payment" | "shipped";
type ResponseFormat = "csv" | "json";

const SEGMENT_TO_STATUS: Record<ContactSegment, OrderContactExportStatus> = {
  pending_payment: "PENDING_PAYMENT",
  shipped: "SHIPPED",
};

function normalizeSegment (rawValue: string | null): ContactSegment | null
{
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (
    normalized === "pending_payment" ||
    normalized === "pending-payment" ||
    normalized === "pending" ||
    normalized === "abandoned" ||
    normalized === "abandoned-cart"
  ) {
    return "pending_payment";
  }

  if (normalized === "shipped" || normalized === "ship-status") {
    return "shipped";
  }

  return null;
}

function normalizeFormat (rawValue: string | null): ResponseFormat | null
{
  if (!rawValue) {
    return "csv";
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "csv" || normalized === "json") {
    return normalized;
  }

  return null;
}

function sanitizeCsvValue (value: string): string
{
  const singleLine = value.replace(/\r\n|\n|\r/g, " ").trim();
  return /^[=+\-@]/.test(singleLine) ? `'${singleLine}` : singleLine;
}

function escapeCsvField (value: string | number): string
{
  const safeValue = sanitizeCsvValue(String(value));
  return `"${safeValue.replace(/"/g, "\"\"")}"`;
}

function contactsToCsv (contacts: OrderContactExportRecord[]): string
{
  const headers = [
    "customer_name",
    "customer_email",
    "customer_phone",
    "shipping_street",
    "shipping_city",
    "shipping_state",
    "shipping_zip_code",
    "shipping_country",
    "last_order_id",
    "last_order_number",
    "last_order_status",
    "last_order_created_at",
    "last_order_updated_at",
  ];

  const rows = contacts.map((contact) =>
    [
      contact.customerName,
      contact.customerEmail,
      contact.customerPhone,
      contact.shippingStreet,
      contact.shippingCity,
      contact.shippingState,
      contact.shippingZipCode,
      contact.shippingCountry,
      contact.lastOrderId,
      contact.lastOrderNumber,
      contact.lastOrderStatus,
      contact.lastOrderCreatedAt,
      contact.lastOrderUpdatedAt,
    ]
      .map(escapeCsvField)
      .join(",")
  );

  return `\uFEFF${[headers.join(","), ...rows].join("\n")}`;
}

function buildFilename (segment: ContactSegment): string
{
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${segment}-contacts-${dateStamp}.csv`;
}

export async function GET (request: NextRequest): Promise<NextResponse>
{
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const segment = normalizeSegment(request.nextUrl.searchParams.get("segment"));
  if (!segment) {
    return NextResponse.json(
      {
        error:
          "Invalid or missing segment. Use segment=pending_payment or segment=shipped.",
      },
      { status: 400 }
    );
  }

  const format = normalizeFormat(request.nextUrl.searchParams.get("format"));
  if (!format) {
    return NextResponse.json(
      { error: "Invalid format. Use format=csv or format=json." },
      { status: 400 }
    );
  }

  const status = SEGMENT_TO_STATUS[segment];
  const contacts = await getOrderContactsByStatus(status);

  if (format === "json") {
    return NextResponse.json(
      {
        segment,
        status,
        count: contacts.length,
        contacts,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const csv = contactsToCsv(contacts);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildFilename(segment)}"`,
      "Cache-Control": "no-store",
    },
  });
}
