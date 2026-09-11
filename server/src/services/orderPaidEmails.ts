import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { resolveOrderItemImages } from '../utils/emailImageUrl.js';
import { sendMail, warnMissingSmtpOnce } from './emailTransport.js';

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
    label?: string;
    recipientName?: string;
    recipientMobile?: string;
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
  const raw = [env.ADMIN_ORDER_NOTIFY_EMAIL, env.ADMIN_EMAILS].filter(Boolean).join(',');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
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

type OrderAddressEmail = PaidOrderNotifyPayload['address'];

function addressRows(addr: OrderAddressEmail): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | undefined | null) => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (v) rows.push({ label, value: v });
  };
  push('Address label', addr.label);
  push('Recipient name', addr.recipientName);
  push('Recipient mobile', addr.recipientMobile);
  push('Address line 1', addr.line1);
  push('Address line 2', addr.line2);
  push('City', addr.city);
  push('State / UT', addr.state);
  push('PIN / Postal code', addr.postalCode);
  const country = (addr.country ?? 'IN').trim() || 'IN';
  rows.push({ label: 'Country', value: country });
  return rows;
}

function addressTextBlock(addr: OrderAddressEmail): string {
  return addressRows(addr)
    .map((r) => `${r.label}: ${r.value}`)
    .join('\n');
}

function addressHtmlBlock(addr: OrderAddressEmail): string {
  const rows = addressRows(addr)
    .map(
      (r) =>
        `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;font-weight:600;color:#333;white-space:nowrap;border-bottom:1px solid #eee">${escapeHtml(r.label)}</td><td style="padding:6px 0;vertical-align:top;border-bottom:1px solid #eee">${escapeHtml(r.value)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;border-collapse:collapse;font:inherit;background:#f9f9f9;border:1px solid #eee;border-radius:8px;overflow:hidden"><tbody>${rows}</tbody></table>`;
}

function itemsHtmlTable(items: PaidOrderLine[], imageSrcs: (string | null)[]): string {
  const rows = items
    .map((i, index) => {
      const img = imageSrcs[index] ?? null;
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

function itemsTextBlock(items: PaidOrderLine[], imageSrcs: (string | null)[]): string {
  return items
    .map((i, index) => {
      const img = imageSrcs[index] ?? null;
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

function buildAdminBodies(
  payload: PaidOrderNotifyPayload,
  imageSrcs: (string | null)[],
  customerEmail: string | undefined,
  customerName: string | undefined,
) {
  const total = rupeesFromPaise(payload.amountPaise);
  const addrText = addressTextBlock(payload.address);
  const addrHtml = addressHtmlBlock(payload.address);
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
    itemsTextBlock(payload.items, imageSrcs),
    '',
    'Ship to:',
    addrText,
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
${itemsHtmlTable(payload.items, imageSrcs)}
<h3 style="margin:24px 0 8px">Ship to</h3>
${addrHtml}
</body></html>`;

  return { subject, text, html };
}

function buildCustomerBodies(
  payload: PaidOrderNotifyPayload,
  imageSrcs: (string | null)[],
  customerName: string | undefined,
) {
  const total = rupeesFromPaise(payload.amountPaise);
  const addrText = addressTextBlock(payload.address);
  const addrHtml = addressHtmlBlock(payload.address);
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
    itemsTextBlock(payload.items, imageSrcs),
    '',
    'Shipping address:',
    addrText,
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
${itemsHtmlTable(payload.items, imageSrcs)}
<h3 style="margin:24px 0 8px">Shipping address</h3>
${addrHtml}
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
  if (!env.SMTP_HOST?.trim()) {
    warnMissingSmtpOnce(
      'SMTP_HOST is not set — order confirmation emails are disabled. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env, then restart the API.',
    );
    return;
  }

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

  const adminTo = parseNotifyEmails().filter((email) => email !== customerEmail?.toLowerCase());

  const { imageSrcs, attachments } = await resolveOrderItemImages(payload.items);

  const tasks: Promise<void>[] = [];

  if (customerEmail) {
    const b = buildCustomerBodies(payload, imageSrcs, customerName);
    tasks.push(
      sendMail({ to: customerEmail, ...b, attachments })
        .then((sent) => {
          if (!sent) throw new Error('SMTP not configured');
        })
        .catch((err) => {
          console.error(`[notifyOrderPaidEmails] customer email failed (${customerEmail})`, err);
          throw err;
        }),
    );
  } else {
    console.warn('[notifyOrderPaidEmails] no customer email for user', payload.userId);
  }

  if (adminTo.length > 0) {
    const b = buildAdminBodies(payload, imageSrcs, customerEmail, customerName);
    for (const adminEmail of adminTo) {
      tasks.push(
        sendMail({
          to: adminEmail,
          subject: b.subject,
          text: b.text,
          html: b.html,
          attachments,
        })
          .then((sent) => {
            if (!sent) throw new Error('SMTP not configured');
          })
          .catch((err) => {
            console.error(`[notifyOrderPaidEmails] admin email failed (${adminEmail})`, err);
            throw err;
          }),
      );
    }
  } else {
    console.warn(
      '[notifyOrderPaidEmails] no admin notify inbox — set ADMIN_ORDER_NOTIFY_EMAIL or ADMIN_EMAILS in .env',
    );
  }

  if (tasks.length === 0) return;

  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[notifyOrderPaidEmails] ${failed.length}/${results.length} email(s) failed`);
  }
}
