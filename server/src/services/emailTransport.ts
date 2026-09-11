import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import type { EmailImageAttachment } from '../utils/emailImageUrl.js';

let warnedMissingSmtp = false;

function normalizeSmtpPass(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, '') ?? '';
}

export function isSmtpConfigured(): boolean {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS ?? '';
  return Boolean(host && user && pass);
}

export function warnMissingSmtpOnce(reason: string): void {
  if (warnedMissingSmtp) return;
  warnedMissingSmtp = true;
  console.warn(`[email] ${reason}`);
}

export function createTransporter() {
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    warnMissingSmtpOnce(
      'SMTP_HOST is not set — emails are disabled. Add SMTP_HOST, SMTP_USER, and SMTP_PASS to .env, then restart the API.',
    );
    return null;
  }
  const port = Number(env.SMTP_PORT) > 0 ? Number(env.SMTP_PORT) : 587;
  const secure =
    port === 465 || env.SMTP_SECURE?.trim().toLowerCase() === 'true' || env.SMTP_SECURE === '1';
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS ?? '';
  if (!user || !pass) {
    warnMissingSmtpOnce(
      'SMTP_USER or SMTP_PASS is missing — emails are disabled. Set both in .env (Gmail: use an App Password).',
    );
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export function fromAddress(label = 'Paduchu Andham Orders'): string {
  const user = env.SMTP_USER?.trim();
  const addr = env.SMTP_FROM?.trim() || user;
  if (!addr) return 'orders@paduchuandham.com';
  return `"${label}" <${addr}>`;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailImageAttachment[];
  fromLabel?: string;
}): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;
  const from = fromAddress(opts.fromLabel);
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: (opts.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: a.content,
      cid: a.cid,
      contentType: a.contentType,
    })),
  });
  console.info(`[email] sent "${opts.subject}" to ${opts.to}`);
  return true;
}

export function isAdminOtpEmailConfigured(): boolean {
  const host = env.SMTP_HOST?.trim();
  const email = env.ADMIN_OTP_EMAIL?.trim();
  const pass = normalizeSmtpPass(env.ADMIN_OTP_SMTP_PASS) || normalizeSmtpPass(env.SMTP_PASS) || '';
  return Boolean(host && email && pass);
}

export function createAdminOtpTransporter() {
  const host = env.SMTP_HOST?.trim();
  if (!host) {
    warnMissingSmtpOnce(
      'SMTP_HOST is not set — admin OTP emails are disabled. Add SMTP_HOST to .env, then restart the API.',
    );
    return null;
  }
  const port = Number(env.SMTP_PORT) > 0 ? Number(env.SMTP_PORT) : 587;
  const secure =
    port === 465 || env.SMTP_SECURE?.trim().toLowerCase() === 'true' || env.SMTP_SECURE === '1';
  const user = env.ADMIN_OTP_EMAIL?.trim();
  const pass = normalizeSmtpPass(env.ADMIN_OTP_SMTP_PASS) || normalizeSmtpPass(env.SMTP_PASS);
  if (!user) {
    warnMissingSmtpOnce(
      'ADMIN_OTP_EMAIL is not set — admin OTP emails are disabled. Set ADMIN_OTP_EMAIL in .env.',
    );
    return null;
  }
  if (!pass) {
    warnMissingSmtpOnce(
      'ADMIN_OTP_SMTP_PASS or SMTP_PASS is missing — admin OTP emails are disabled.',
    );
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function adminOtpFromAddress(): string {
  const addr = env.ADMIN_OTP_EMAIL?.trim();
  if (!addr) return '"Paduchu Andham Security" <security@paduchuandham.com>';
  return `"Paduchu Andham Security" <${addr}>`;
}

export async function sendAdminOtpMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const transporter = createAdminOtpTransporter();
  if (!transporter) return false;
  await transporter.sendMail({
    from: adminOtpFromAddress(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  console.info(`[email] sent admin OTP "${opts.subject}" to ${opts.to}`);
  return true;
}
