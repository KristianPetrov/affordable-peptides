import type { Order } from "./orders";
import { formatOrderNumber } from "./orders";
import { Resend } from 'resend'
import { calculateVolumePricing } from "./cart-pricing";
import
{
  buildCashAppLink,
  buildVenmoLink,
  ZELLE_EMAIL,
  ZELLE_RECIPIENT_NAME,
} from "./payment-links";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@affordablepeptides.life";
const ADMIN_SMS_EMAIL = process.env.ADMIN_SMS_EMAIL;

const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeBaseUrl (input: string): string
{
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/$/, "");
}

const SITE_BASE_URL = (() =>
{
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.APP_BASE_URL,
    process.env.VERCEL_URL,
  ].filter(Boolean) as string[];

  return normalizeBaseUrl(candidates[0] ?? FALLBACK_SITE_URL);
})();

function buildOrderLookupUrl (order: Order): string
{
  const url = new URL("/order-lookup", SITE_BASE_URL);
  url.searchParams.set("orderNumber", order.orderNumber);
  url.searchParams.set("email", order.customerEmail);
  return url.toString();
}

function logEmailPreview (
  to: string,
  content: {
    subject: string;
    text: string;
  }
): void
{
  console.log("=".repeat(60));
  console.log("EMAIL TO:", to);
  console.log("SUBJECT:", content.subject);
  console.log("=".repeat(60));
  console.log(content.text);
  console.log("=".repeat(60));
}

export function formatOrderEmail (order: Order):
  {
    subject: string;
    html: string;
    text: string;
  }
{
  const orderNumber = formatOrderNumber(order.orderNumber);
  const formattedDate = new Date(order.createdAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const pricing = calculateVolumePricing(order.items);

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.variantLabel}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.count} × Qty ${item.tierQuantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">$${(pricing.lineItemTotals[item.key] ?? item.tierPrice * item.count).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #9333ea; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .order-info { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #9333ea; }
    table { width: 100%; border-collapse: collapse; background: white; margin: 15px 0; }
    th { background: #9333ea; color: white; padding: 10px; text-align: left; }
    .total { font-size: 18px; font-weight: bold; text-align: right; padding: 15px; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
    .status-pending { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Order Received</h1>
    </div>
    <div class="content">
      <div class="order-info">
        <h2>Order ${orderNumber}</h2>
        <p><strong>Status:</strong> <span class="status status-pending">${order.status}</span></p>
        <p><strong>Date:</strong> ${formattedDate}</p>
      </div>

      <div class="order-info">
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.customerEmail}</p>
        <p><strong>Phone:</strong> ${order.customerPhone}</p>
        <p><strong>Shipping Address:</strong><br>
        ${order.shippingAddress.street}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
        ${order.shippingAddress.country}</p>
      </div>

      <div class="order-info">
        <h3>Order Items</h3>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Quantity</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          Total: $${order.subtotal.toFixed(2)}<br>
          <small>Total Units: ${order.totalUnits}</small>
        </div>
      </div>

      <p style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 4px;">
        <strong>Action Required:</strong> Customer will text payment confirmation. Please verify payment and update order status in the admin panel.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
New Order Received

Order ${orderNumber}
Status: ${order.status}
Date: ${formattedDate}

Customer Information:
Name: ${order.customerName}
Email: ${order.customerEmail}
Phone: ${order.customerPhone}
Shipping Address:
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}

Order Items:
${order.items
      .map(
        (item) =>
          `- ${item.productName} (${item.variantLabel}): ${item.count} × Qty ${item.tierQuantity} = $${(pricing.lineItemTotals[item.key] ?? item.tierPrice * item.count).toFixed(2)}`
      )
      .join("\n")}

Total: $${order.subtotal.toFixed(2)}
Total Units: ${order.totalUnits}

Action Required: Customer will text payment confirmation. Please verify payment and update order status in the admin panel.
  `;

  return {
    subject: `New Order: ${orderNumber} - ${order.customerName}`,
    html,
    text,
  };
}

function formatCustomerReceiptEmail (
  order: Order,
  receiptUrl: string
):
  {
    subject: string;
    html: string;
    text: string;
  }
{
  const orderNumber = formatOrderNumber(order.orderNumber);
  const formattedDate = new Date(order.createdAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const pricing = calculateVolumePricing(order.items);
  const amountDisplay = order.subtotal.toFixed(2);
  const cashAppLink = buildCashAppLink(order.subtotal);
  const venmoLink = buildVenmoLink({
    amount: order.subtotal,
    note: `Order ${orderNumber}`,
  });
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.variantLabel}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.count} × Qty ${item.tierQuantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(pricing.lineItemTotals[item.key] ?? item.tierPrice * item.count).toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 640px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(146, 64, 214, 0.15); }
    .header { background: linear-gradient(135deg, #7c3aed, #9333ea); color: white; padding: 32px; }
    .header h1 { margin: 0 0 12px 0; font-size: 28px; }
    .content { padding: 28px; }
    .cta { display: inline-block; margin: 16px 0; padding: 14px 28px; border-radius: 9999px; background: #7c3aed; color: white; text-decoration: none; font-weight: bold; }
    .info-block { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #ede9fe; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    th { text-align: left; background: #f3f4f6; padding: 12px; font-size: 13px; color: #4b5563; letter-spacing: 0.08em; text-transform: uppercase; }
    .total { font-size: 20px; font-weight: bold; text-align: right; padding: 16px; }
    .footer { font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>You're all set!</h1>
        <p style="margin: 0; font-size: 16px;">Order ${orderNumber} • Placed ${formattedDate}</p>
      </div>
      <div class="content">
        <p>Thanks for choosing Affordable Peptides. Save this email for your records. You can review order details or upload payment confirmation anytime.</p>
        <a class="cta" style="color: #ffffff !important;" href="${receiptUrl}" target="_blank" rel="noopener noreferrer">View Your Order</a>

        <div class="info-block">
          <h3 style="margin-top: 0; margin-bottom: 8px;">Next steps</h3>
          <ol style="margin: 0; padding-left: 18px;">
            <li>Send payment via Cash App, Venmo, or Zelle using the options below.</li>
            <li>Text (951) 539-3821 with your name, order number (${orderNumber}), and payment screenshot.</li>
            <li>We’ll confirm manually and follow up with shipping details.</li>
          </ol>
        </div>

        <div class="info-block">
          <h3 style="margin-top: 0; margin-bottom: 12px;">Payment options</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <a href="${cashAppLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
              <div style="border-radius: 9999px; background: #059669; color: white; text-align: center; padding: 12px 24px; font-weight: bold;">
                Pay $${amountDisplay} via Cash App
              </div>
            </a>
            <a href="${venmoLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;">
              <div style="border-radius: 9999px; background: #2563eb; color: white; text-align: center; padding: 12px 24px; font-weight: bold;">
                Pay $${amountDisplay} via Venmo
              </div>
            </a>
            <div style="font-size: 14px; color: #374151;">
              Prefer Zelle? Send $${amountDisplay} to <strong>${ZELLE_EMAIL}</strong> (recipient: <strong>${ZELLE_RECIPIENT_NAME}</strong>).
            </div>
          </div>
        </div>

        <div class="info-block">
          <h3 style="margin-top: 0; margin-bottom: 8px;">Shipping to</h3>
          <p style="margin: 0;">
            ${order.customerName}<br />
            ${order.shippingAddress.street}<br />
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br />
            ${order.shippingAddress.country}
          </p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>Quantity</th>
              <th style="text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          Total: $${order.subtotal.toFixed(2)}<br />
          <small style="font-weight: normal; color: #6b7280;">${order.totalUnits} total unit${order.totalUnits === 1 ? "" : "s"}</small>
        </div>

        <p style="margin-top: 24px;">Need anything? Reply to this email or call (951) 539-3821 and reference your order number.</p>
      </div>
    </div>
    <p class="footer">Affordable Peptides • View your order anytime: <a href="${receiptUrl}" style="color: #7c3aed;">${receiptUrl}</a></p>
  </div>
</body>
</html>
  `;

  const text = [
    `Thanks for your order!`,
    ``,
    `Order ${orderNumber}`,
    `Placed ${formattedDate}`,
    ``,
    `View your order: ${receiptUrl}`,
    ``,
    `Payment options for $${amountDisplay}:`,
    `- Cash App: ${cashAppLink}`,
    `- Venmo: ${venmoLink}`,
    `- Zelle: ${ZELLE_EMAIL} (recipient: ${ZELLE_RECIPIENT_NAME})`,
    ``,
    `Shipping To:`,
    `${order.customerName}`,
    `${order.shippingAddress.street}`,
    `${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`,
    `${order.shippingAddress.country}`,
    ``,
    `Items:`,
    ...order.items.map(
      (item) =>
        `- ${item.productName} (${item.variantLabel}) • ${item.count} × Qty ${item.tierQuantity} = $${(pricing.lineItemTotals[item.key] ?? item.tierPrice * item.count).toFixed(2)}`
    ),
    ``,
    `Total: $${order.subtotal.toFixed(2)} • ${order.totalUnits} units`,
    ``,
    `Next Steps:`,
    `1. Send payment via Cash App, Venmo, or Zelle.`,
    `2. Text (951) 539-3821 with your name, Order ${orderNumber}, and payment screenshot.`,
    `3. We'll confirm manually and update you once your order ships.`,
  ].join("\n");

  return {
    subject: `Receipt for Order ${orderNumber}`,
    html,
    text,
  };
}

function formatOrderSms (order: Order): string
{
  const orderNumber = formatOrderNumber(order.orderNumber);
  const shipping = order.shippingAddress;
  const itemsSummary = order.items
    .map(
      (item) =>
        `${item.productName} (${item.variantLabel}) ×${item.count}`
    )
    .join("; ");

  return [
    `New Order ${orderNumber}`,
    `${order.customerName} | ${order.customerPhone}`,
    `${shipping.city}, ${shipping.state} ${shipping.zipCode}`,
    `Total $${order.subtotal.toFixed(2)} | Units ${order.totalUnits}`,
    itemsSummary ? `Items: ${itemsSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendOrderEmail (order: Order): Promise<void>
{
  const adminEmailContent = formatOrderEmail(order);
  const customerEmailContent = formatCustomerReceiptEmail(
    order,
    buildOrderLookupUrl(order)
  );
  const smsContent = ADMIN_SMS_EMAIL ? formatOrderSms(order) : null;

  // Only send email if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Email not sent.");
    logEmailPreview(ADMIN_EMAIL, adminEmailContent);
    logEmailPreview(order.customerEmail, customerEmailContent);
    if (ADMIN_SMS_EMAIL && smsContent) {
      console.log("SMS EMAIL TO:", ADMIN_SMS_EMAIL);
      console.log("-".repeat(60));
      console.log(smsContent);
      console.log("-".repeat(60));
    }
    return;
  }

  try {
    const sendOperations = [
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "orders@affordablepeptides.life",
        to: ADMIN_EMAIL,
        subject: adminEmailContent.subject,
        html: adminEmailContent.html,
        text: adminEmailContent.text,
      }),
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "orders@affordablepeptides.life",
        to: order.customerEmail,
        subject: customerEmailContent.subject,
        html: customerEmailContent.html,
        text: customerEmailContent.text,
      }),
    ];

    if (ADMIN_SMS_EMAIL && smsContent) {
      sendOperations.push(
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "orders@affordablepeptides.life",
          to: ADMIN_SMS_EMAIL,
          subject: `New Order SMS: ${formatOrderNumber(order.orderNumber)}`,
          text: smsContent,
        })
      );
    }

    await Promise.all(sendOperations).then((results) =>
    {
      console.log("Email sent successfully");
      console.log(JSON.stringify(results));
    }).catch((error) =>
    {
      console.error("Failed to send email via Resend:", error);
      throw error;
    });
  } catch (error) {
    console.error("Failed to send email via Resend:", error);
    throw error;
  }
}

