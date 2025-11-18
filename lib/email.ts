import type { Order } from "./orders";
import { formatOrderNumber } from "./orders";
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@affordablepeptides.life";
const ADMIN_SMS_EMAIL = process.env.ADMIN_SMS_EMAIL;

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

    const itemsHtml = order.items
        .map(
            (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.variantLabel}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333;">${item.count} × Qty ${item.tierQuantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">$${(item.tierPrice * item.count).toFixed(2)}</td>
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
                    `- ${item.productName} (${item.variantLabel}): ${item.count} × Qty ${item.tierQuantity} = $${(item.tierPrice * item.count).toFixed(2)}`
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
    const emailContent = formatOrderEmail(order);
    const smsContent = ADMIN_SMS_EMAIL ? formatOrderSms(order) : null;

    // Only send email if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not configured. Email not sent.");
        console.log("=".repeat(60));
        console.log("EMAIL TO:", ADMIN_EMAIL);
        console.log("SUBJECT:", emailContent.subject);
        console.log("=".repeat(60));
        console.log(emailContent.text);
        console.log("=".repeat(60));
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
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
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

        await Promise.all(sendOperations);
    } catch (error) {
        console.error("Failed to send email via Resend:", error);
        throw error;
    }
}

