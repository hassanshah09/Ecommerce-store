import nodemailer from 'nodemailer';
import type { Order, StoreConfig, Review, EmailLog } from '../src/types';
import { db } from './db';

// Format currency helper for server email templates
function formatMoney(amount: number, currency = 'PKR'): string {
  return `${currency} ${amount.toLocaleString('en-PK')}`;
}

// Lazy nodemailer transporter
let transporter: any = null;

function getTransporter(config?: StoreConfig) {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      return transporter;
    } catch (err) {
      console.warn('Failed to initialize SMTP transporter, falling back to simulated logger:', err);
    }
  }

  // Fallback: In-memory/stream transporter that records message
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: EmailLog['type'];
  orderId?: string;
  orderNumber?: string;
  config?: StoreConfig;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, html, text, type, orderId, orderNumber, config } = options;
  const activeConfig = config || db.getConfig();
  const fromAddress =
    process.env.SMTP_FROM ||
    `"${activeConfig.emailSettings?.senderName || activeConfig.store.name}" <${activeConfig.emailSettings?.senderEmail || activeConfig.contact.email || 'orders@novamart.pk'}>`;

  const emailId = `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanSnippet = (text || html.replace(/<[^>]+>/g, ' ')).slice(0, 140).replace(/\s+/g, ' ').trim();

  try {
    const transport = getTransporter(activeConfig);
    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || cleanSnippet,
      html,
    });

    const emailLog: EmailLog = {
      id: emailId,
      to,
      from: fromAddress,
      subject,
      type,
      status: 'sent',
      sentAt: new Date().toISOString(),
      orderId,
      orderNumber,
      previewSnippet: cleanSnippet,
      html,
    };

    db.addEmailLog(emailLog);
    db.logAction('Email Dispatched', 'system', `Sent ${type} email to ${to} (${subject})`);

    return { success: true, messageId: info.messageId || emailId };
  } catch (err: any) {
    console.error('Email sending error:', err);

    const emailLog: EmailLog = {
      id: emailId,
      to,
      from: fromAddress,
      subject,
      type,
      status: 'failed',
      sentAt: new Date().toISOString(),
      orderId,
      orderNumber,
      previewSnippet: cleanSnippet,
      html,
      errorMessage: err.message || 'Transmission failed',
    };

    db.addEmailLog(emailLog);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// HTML EMAIL TEMPLATES
// -------------------------------------------------------------

export function generateOrderReceiptEmailHtml(order: Order, config: StoreConfig): string {
  const orderNum = order.orderNumber || order.orderId;
  const curr = config.store.currency;
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e7e5e4;">
        <td style="padding: 12px 8px;">
          <div style="font-weight: 600; color: #1c1917; font-size: 14px;">${item.name}</div>
          ${item.selectedVariant ? `<div style="font-size: 12px; color: #78716c; margin-top: 2px;">${item.selectedVariant}</div>` : ''}
          <div style="font-size: 12px; color: #a8a29e; font-family: monospace; margin-top: 2px;">ID: ${item.productId}</div>
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #44403c; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; color: #44403c; font-size: 14px; font-family: monospace;">${formatMoney(item.price, curr)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #047857; font-size: 14px; font-family: monospace;">${formatMoney(item.price * item.quantity, curr)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Receipt - ${orderNum}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f4; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#292524;">
  <div style="max-width:600px; margin:24px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e7e5e4; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color:#ffffff;">
      <h1 style="margin:0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${config.store.name}</h1>
      <p style="margin:6px 0 0 0; font-size: 14px; opacity: 0.9;">${config.store.tagline || 'Official Order Invoice & Receipt'}</p>
      <div style="margin-top: 16px; display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">
        Order #${orderNum} • Status: ${order.status.toUpperCase()}
      </div>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">
        Dear <strong>${order.customer.name}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #57534e;">
        Thank you for shopping with ${config.store.name}. Your order has been registered and is being processed by our dispatch fulfillment team. Here is your official order breakdown.
      </p>

      <!-- Customer & Shipping Card -->
      <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px;">Delivery Details</h3>
        <div style="font-size: 13px; line-height: 1.5; color: #292524;">
          <div><strong>Recipient:</strong> ${order.customer.name}</div>
          <div><strong>WhatsApp Phone:</strong> ${order.customer.phone}</div>
          ${order.customer.address ? `<div><strong>Delivery Address:</strong> ${order.customer.address}, ${order.customer.city || ''}</div>` : ''}
          ${order.customer.notes ? `<div style="color: #78716c; margin-top: 4px;"><strong>Notes:</strong> ${order.customer.notes}</div>` : ''}
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="background: #f5f5f4; color: #57534e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            <th style="padding: 10px 8px; text-align: left;">Item</th>
            <th style="padding: 10px 8px; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; text-align: right;">Price</th>
            <th style="padding: 10px 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 2px solid #e7e5e4; padding-top: 14px; margin-top: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #57534e; margin-bottom: 6px;">
          <span>Subtotal:</span>
          <span style="font-family: monospace; font-weight: 600;">${formatMoney(order.subtotal, curr)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; color: #57534e; margin-bottom: 10px;">
          <span>Delivery Charges:</span>
          <span style="font-family: monospace; font-weight: 600;">${order.shipping === 0 ? 'FREE' : formatMoney(order.shipping, curr)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #059669; border-top: 1px dashed #d6d3d1; padding-top: 10px;">
          <span>Grand Total:</span>
          <span style="font-family: monospace;">${formatMoney(order.total, curr)}</span>
        </div>
      </div>

      <!-- WhatsApp Action -->
      <div style="margin-top: 28px; padding: 18px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; text-align: center;">
        <div style="font-weight: 700; color: #065f46; font-size: 14px; margin-bottom: 6px;">Need Assistance or Live Updates?</div>
        <div style="font-size: 13px; color: #047857; margin-bottom: 12px;">Contact us on WhatsApp: <strong>${config.contact.whatsappNumber}</strong></div>
        <a href="https://wa.me/92${config.contact.whatsappNumber.replace(/\D/g, '').replace(/^0/, '')}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 700;">
          Chat on WhatsApp
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f5f5f4; padding: 16px 24px; text-align: center; font-size: 12px; color: #a8a29e; border-top: 1px solid #e7e5e4;">
      ${config.footer.copyright || `© ${new Date().getFullYear()} ${config.store.name}. All rights reserved.`}
    </div>
  </div>
</body>
</html>`;
}

export function generateReviewThankYouEmailHtml(review: Review, config: StoreConfig): string {
  const stars = '★'.repeat(review.rating) + '☆'.repeat(Math.max(0, 5 - review.rating));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Thank you for your review</title></head>
<body style="margin:0; padding:0; background-color:#f5f5f4; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#292524;">
  <div style="max-width:580px; margin:24px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e7e5e4; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:#059669; padding:28px 24px; text-align:center; color:#ffffff;">
      <h1 style="margin:0; font-size:22px; font-weight:800;">Thank You For Your Feedback!</h1>
      <p style="margin:4px 0 0 0; font-size:13px; opacity:0.9;">${config.store.name} Verified Customer Review</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="font-size:15px; line-height:1.6; margin-top:0;">
        Dear <strong>${review.customerName}</strong>,
      </p>
      <p style="font-size:14px; line-height:1.6; color:#57534e;">
        We genuinely appreciate you taking the time to share your feedback for Order <strong>${review.orderNumber || review.orderId}</strong>! Your review helps other shoppers in Pakistan make confident purchases.
      </p>

      <div style="background:#fafaf9; border:1px solid #e7e5e4; border-radius:12px; padding:18px; margin:20px 0;">
        <div style="color:#eab308; font-size:20px; letter-spacing:2px; margin-bottom:8px;">${stars}</div>
        <div style="font-size:14px; font-style:italic; color:#292524; line-height:1.5;">"${review.comment}"</div>
        ${review.productName ? `<div style="font-size:12px; color:#78716c; margin-top:10px; font-weight:600;">Product: ${review.productName}</div>` : ''}
        <div style="font-size:11px; color:#059669; font-weight:700; margin-top:6px;">✓ Verified Purchase Rating: ${review.rating}/5 Stars</div>
      </div>

      <p style="font-size:14px; line-height:1.6; color:#57534e;">
        As a token of our appreciation, keep an eye out for exclusive WhatsApp loyalty offers on your next order.
      </p>

      <div style="margin-top:24px; text-align:center;">
        <a href="https://wa.me/92${config.contact.whatsappNumber.replace(/\D/g, '').replace(/^0/, '')}" style="display:inline-block; background:#059669; color:#ffffff; text-decoration:none; padding:10px 22px; border-radius:10px; font-size:13px; font-weight:700;">
          Shop Again on WhatsApp
        </a>
      </div>
    </div>
    <div style="background:#f5f5f4; padding:14px 24px; text-align:center; font-size:12px; color:#a8a29e; border-top:1px solid #e7e5e4;">
      ${config.store.name} • ${config.contact.email}
    </div>
  </div>
</body>
</html>`;
}

export function generateOrderStatusUpdateEmailHtml(order: Order, config: StoreConfig): string {
  const orderNum = order.orderNumber || order.orderId;
  const statusFormatted = order.status.replace(/_/g, ' ').toUpperCase();

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Status Update - ${orderNum}</title></head>
<body style="margin:0; padding:0; background-color:#f5f5f4; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#292524;">
  <div style="max-width:580px; margin:24px auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e7e5e4; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:#0d9488; padding:28px 24px; text-align:center; color:#ffffff;">
      <h1 style="margin:0; font-size:22px; font-weight:800;">Order Update: ${statusFormatted}</h1>
      <p style="margin:4px 0 0 0; font-size:13px; opacity:0.9;">Order #${orderNum}</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="font-size:15px; line-height:1.6; margin-top:0;">
        Hello <strong>${order.customer.name}</strong>,
      </p>
      <p style="font-size:14px; line-height:1.6; color:#57534e;">
        Your order <strong>#${orderNum}</strong> with ${config.store.name} has been updated to:
      </p>

      <div style="background:#f0fdfa; border:1px solid #99f6e4; border-radius:12px; padding:18px; text-align:center; margin:20px 0;">
        <div style="font-size:18px; font-weight:800; color:#0f766e;">${statusFormatted}</div>
        ${order.notes ? `<div style="font-size:13px; color:#115e59; margin-top:6px;">${order.notes}</div>` : ''}
      </div>

      <div style="font-size:13px; color:#78716c; line-height:1.5;">
        Total: <strong>${formatMoney(order.total, config.store.currency)}</strong> (${order.items.length} items)
      </div>

      <div style="margin-top:24px; text-align:center;">
        <a href="https://wa.me/92${config.contact.whatsappNumber.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`Hello, checking status of order ${orderNum}`)}" style="display:inline-block; background:#0d9488; color:#ffffff; text-decoration:none; padding:10px 22px; border-radius:10px; font-size:13px; font-weight:700;">
          Inquire on WhatsApp
        </a>
      </div>
    </div>
    <div style="background:#f5f5f4; padding:14px 24px; text-align:center; font-size:12px; color:#a8a29e; border-top:1px solid #e7e5e4;">
      ${config.store.name} Customer Care
    </div>
  </div>
</body>
</html>`;
}
