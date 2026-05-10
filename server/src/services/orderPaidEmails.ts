import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

export type PaidOrderLine = {
  name: string;
  qty: number;
  /** Per-unit price in paise */
  price: number;
  /** First catalogue image URL/path from DB; resolved to absolute URL in HTML */
  imageRaw: string | null;
};

export type PaidOrderNotifyPayload = {
  orderId: string;
  userId: string;
  amountPaise: number;
  currency: string;
  items: PaidOrderLine[];
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  razorpayPaymentId: string;
  placedAtIso: string;
};

function rupeesFromPaise(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function formatPlacedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function parseNotifyEmails(): string[] {
  const raw = env.ADMIN_ORDER_NOTIFY_EMAIL ?? '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function absoluteImageUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const base = (env.SERVER_PUBLIC_URL ?? env.CLIENT_URL).replace(/\/$/, '');
  return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lineTotalPaise(i: PaidOrderLine): number {
  return i.price * i.qty;
}

function addressBlock(addr: PaidOrderNotifyPayload['address']): string {
  return [
    addr.line1,
    addr.line2,
    `${addr.city}, ${addr.state} ${addr.postalCode}`,
    addr.country ?? 'IN',
  ]
    .filter(Boolean)
    .join('\n');
}

function itemsHtmlTable(items: PaidOrderLine[]): string {
  const rows = items
    .map((i) => {
      const img = absoluteImageUrl(i.imageRaw);
      const thumb = img
        ? `<img src="${escapeHtml(img)}" width="72" height="72" style="object-fit:cover;border-radius:8px;border:1px solid #e5e5e5;display:block" alt="" />`
        : `<div style="width:72px;height:72px;border-radius:8px;background:#f0f0f0;border:1px solid #e5e5e5"></div>`;
      const line = rupeesFromPaise(lineTotalPaise(i));
      const unit = rupeesFromPaise(i.price);
      return `<tr>
  <td style="padding:12px 8px 12px 0;vertical-align:top;width:88px">${thumb}</td>
  <td style="padding:12px 0;vertical-align:top">
    <div style="font-weight:600;font-size:15px">${escapeHtml(i.name)}</div>
    <div style="color:#555;font-size:14px;margin-top:4px">Qty ${i.qty} × ${unit}</div>
    <div style="font-size:14px;margin-top:4px"><strong>${line}</strong></div>
  </td>
</tr>`;
    })
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse">${rows}</table>`;
}

function itemsTextBlock(items: PaidOrderLine[]): string {
  return items
    .map((i) => {
      const img = absoluteImageUrl(i.imageRaw);
      const bits = [
        `  • ${i.name} × ${i.qty} — ${rupeesFromPaise(lineTotalPaise(i))} (${rupeesFromPaise(i.price)} each)`,
      ];
      if (img) bits.push(`    ${img}`);
      return bits.join('\n');
    })
    .join('\n');
}

function summaryBlock(payload: PaidOrderNotifyPayload, total: string): string {
  return [
    `Order ID: ${payload.orderId}`,
    `Placed: ${formatPlacedAt(payload.placedAtIso)}`,
    `Payment ref (Razorpay): ${payload.razorpayPaymentId}`,
    `Amount paid: ${total}`,
  ].join('\n');
}

function createTransporter() {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;
  const port = Number(env.SMTP_PORT) > 0 ? Number(env.SMTP_PORT) : 587;
  const secure =
    port === 465 || env.SMTP_SECURE?.trim().toLowerCase() === 'true' || env.SMTP_SECURE === '1';
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS ?? '';
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
}

function fromAddress(adminFallback: string): string {
  const user = env.SMTP_USER?.trim();
  return env.SMTP_FROM?.trim() || user || adminFallback;
}

async function sendMail(opts: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const transporter = createTransporter();
  if (!transporter) return;
  const adminList = parseNotifyEmails();
  const from = fromAddress(adminList[0] ?? env.SMTP_USER?.trim() ?? opts.to);
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

function buildAdminBodies(
  payload: PaidOrderNotifyPayload,
  customerEmail: string | undefined,
  customerName: string | undefined,
) {
  const total = rupeesFromPaise(payload.amountPaise);
  const addr = addressBlock(payload.address);
  const customerBits =
    customerName || customerEmail
      ? `<p><strong>Customer:</strong> ${escapeHtml([customerName, customerEmail].filter(Boolean).join(' — '))}</p>`
      : '';

  const subject = `New paid order · ${payload.orderId.slice(-8)} · ${total}`;
  const text = [
    'A customer order was paid successfully.',
    '',
    summaryBlock(payload, total),
    customerName ? `Customer: ${customerName}` : null,
    customerEmail ? `Email: ${customerEmail}` : null,
    '',
    'Items:',
    itemsTextBlock(payload.items),
    '',
    'Ship to:',
    addr,
  ]
    .filter((l) => l != null)
    .join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:16px">
<h2 style="margin:0 0 8px">New paid order</h2>
<p style="color:#444;margin:0 0 16px">${escapeHtml(formatPlacedAt(payload.placedAtIso))}</p>
${customerBits}
<p style="margin:8px 0"><strong>Order ID:</strong> ${escapeHtml(payload.orderId)}</p>
<p style="margin:8px 0"><strong>Razorpay payment:</strong> ${escapeHtml(payload.razorpayPaymentId)}</p>
<p style="margin:8px 0;font-size:18px"><strong>Total paid:</strong> ${escapeHtml(total)}</p>
<h3 style="margin:24px 0 8px;border-top:1px solid #eee;padding-top:16px">Items</h3>
${itemsHtmlTable(payload.items)}
<h3 style="margin:24px 0 8px">Ship to</h3>
<pre style="white-space:pre-wrap;font:inherit;background:#f9f9f9;padding:12px;border-radius:8px;border:1px solid #eee">${escapeHtml(addr)}</pre>
</body></html>`;

  return { subject, text, html };
}

function buildCustomerBodies(payload: PaidOrderNotifyPayload, customerName: string | undefined) {
  const total = rupeesFromPaise(payload.amountPaise);
  const addr = addressBlock(payload.address);
  const ordersUrl = `${env.CLIENT_URL.replace(/\/$/, '')}/account/orders`;
  const greet = customerName ? `Hi ${escapeHtml(customerName)},` : 'Hi,';

  const subject = `Order confirmed — ${total}`;
  const text = [
    `${customerName ? `Hi ${customerName},` : 'Hi,'}`,
    '',
    'Thank you for your purchase. Payment was received successfully.',
    '',
    summaryBlock(payload, total),
    '',
    'Items:',
    itemsTextBlock(payload.items),
    '',
    'Shipping address:',
    addr,
    '',
    `View your orders: ${ordersUrl}`,
    '',
    'If you did not place this order, contact us immediately.',
  ].join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:16px">
<p style="font-size:16px">${greet}</p>
<p>Thank you for your purchase. We received your payment successfully.</p>
<p style="margin:8px 0"><strong>Order ID:</strong> ${escapeHtml(payload.orderId)}</p>
<p style="margin:8px 0"><strong>Placed:</strong> ${escapeHtml(formatPlacedAt(payload.placedAtIso))}</p>
<p style="margin:8px 0"><strong>Payment ref:</strong> ${escapeHtml(payload.razorpayPaymentId)}</p>
<p style="margin:8px 0;font-size:18px"><strong>Amount paid:</strong> ${escapeHtml(total)}</p>
<h3 style="margin:24px 0 8px;border-top:1px solid #eee;padding-top:16px">Your items</h3>
${itemsHtmlTable(payload.items)}
<h3 style="margin:24px 0 8px">Shipping address</h3>
<pre style="white-space:pre-wrap;font:inherit;background:#f9f9f9;padding:12px;border-radius:8px;border:1px solid #eee">${escapeHtml(addr)}</pre>
<p style="margin:24px 0"><a href="${escapeHtml(ordersUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">View my orders</a></p>
<p style="color:#666;font-size:13px">If you did not place this order, please contact us right away.</p>
</body></html>`;

  return { subject, text, html };
}

/**
 * Sends order confirmation to the customer and a detailed alert to admin (when configured).
 * Uses the same SMTP settings for both. Non-blocking for payment flow — callers fire-and-forget.
 */
export async function notifyOrderPaidEmails(payload: PaidOrderNotifyPayload): Promise<void> {
  if (!env.SMTP_HOST?.trim()) return;

  let customerEmail: string | undefined;
  let customerName: string | undefined;
  try {
    const u = await UserModel.findById(payload.userId).select('email name').lean();
    if (u) {
      customerEmail = u.email?.trim() || undefined;
      customerName = u.name?.trim() || undefined;
    }
  } catch (e) {
    console.warn('[notifyOrderPaidEmails] could not load customer user', e);
  }

  const adminTo = parseNotifyEmails();

  const tasks: Promise<void>[] = [];

  if (customerEmail) {
    const b = buildCustomerBodies(payload, customerName);
    tasks.push(sendMail({ to: customerEmail, ...b }));
  }

  if (adminTo.length > 0) {
    const b = buildAdminBodies(payload, customerEmail, customerName);
    tasks.push(
      sendMail({
        to: adminTo.join(', '),
        subject: b.subject,
        text: b.text,
        html: b.html,
      }),
    );
  }

  if (tasks.length === 0) return;

  await Promise.all(tasks);
}
