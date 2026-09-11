import { env } from '../config/env.js';
import {
  ADMIN_OTP_MAX_ATTEMPTS,
  deleteAdminOtpChallenge,
  generateAdminOtp,
  getAdminOtpChallenge,
  hashAdminOtp,
  newAdminOtpChallengeId,
  setAdminOtpChallenge,
  type AdminOtpChallenge,
} from '../cache/adminOtp.js';
import { isAdminOtpEmailConfigured, sendAdminOtpMail } from './emailTransport.js';
import { loadUserById } from '../cache/userLoader.js';
import { setCachedUser } from '../cache/session.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendAdminOtpEmail(email: string, otp: string): Promise<void> {
  const subject = 'Your admin login code — Paduchu Andham';
  const text = [
    'Use this one-time code to finish signing in to the Paduchu Andham admin panel:',
    '',
    otp,
    '',
    'This code expires in 5 minutes. If you did not try to sign in, you can ignore this email.',
  ].join('\n');
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:16px">
<p>Use this one-time code to finish signing in to the Paduchu Andham admin panel:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:24px 0">${escapeHtml(otp)}</p>
<p style="color:#555;font-size:14px">This code expires in 5 minutes. If you did not try to sign in, you can ignore this email.</p>
</body></html>`;

  const sent = await sendAdminOtpMail({
    to: email,
    subject,
    text,
    html,
  });
  if (!sent) {
    throw new Error('Could not send verification email. Check ADMIN_OTP_EMAIL and SMTP settings in .env.');
  }
}

export function getAdminOtpDeliveryEmail(): string {
  const email = env.ADMIN_OTP_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error('ADMIN_OTP_EMAIL is not set in .env.');
  }
  return email;
}

export function assertAdminOtpEmailReady(): void {
  if (!isAdminOtpEmailConfigured()) {
    throw new Error(
      'Admin two-factor email is not configured. Set SMTP_HOST, ADMIN_OTP_EMAIL, and ADMIN_OTP_SMTP_PASS (or SMTP_PASS) in .env.',
    );
  }
  getAdminOtpDeliveryEmail();
}

export async function createAndSendAdminOtp(userId: string): Promise<{ challengeId: string; email: string }> {
  assertAdminOtpEmailReady();
  const deliveryEmail = getAdminOtpDeliveryEmail();
  const challengeId = newAdminOtpChallengeId();
  const otp = generateAdminOtp();
  const otpHash = hashAdminOtp(challengeId, otp, env.JWT_SECRET);
  await setAdminOtpChallenge(challengeId, {
    userId,
    email: deliveryEmail,
    otpHash,
    attempts: 0,
  });
  await sendAdminOtpEmail(deliveryEmail, otp);
  return { challengeId, email: deliveryEmail };
}

export async function resendAdminOtp(challengeId: string): Promise<{ challengeId: string; email: string }> {
  assertAdminOtpEmailReady();
  const existing = await getAdminOtpChallenge(challengeId);
  if (!existing) {
    throw new Error('Verification code expired. Sign in again to receive a new code.');
  }
  const otp = generateAdminOtp();
  const otpHash = hashAdminOtp(challengeId, otp, env.JWT_SECRET);
  await setAdminOtpChallenge(challengeId, {
    ...existing,
    otpHash,
    attempts: 0,
  });
  await sendAdminOtpEmail(existing.email, otp);
  return { challengeId, email: existing.email };
}

export type AdminOtpVerifyResult =
  | { ok: true; user: { id: string; email: string; name: string; role: 'admin' } }
  | { ok: false; status: number; error: string };

export async function verifyAdminOtp(challengeId: string, otp: string): Promise<AdminOtpVerifyResult> {
  const normalizedOtp = otp.trim();
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return { ok: false, status: 400, error: 'Enter the 6-digit verification code.' };
  }

  const challenge = await getAdminOtpChallenge(challengeId);
  if (!challenge) {
    return { ok: false, status: 400, error: 'Verification code expired. Sign in again to receive a new code.' };
  }

  if (challenge.attempts >= ADMIN_OTP_MAX_ATTEMPTS) {
    await deleteAdminOtpChallenge(challengeId);
    return {
      ok: false,
      status: 429,
      error: 'Too many incorrect attempts. Sign in again to receive a new code.',
    };
  }

  const expected = hashAdminOtp(challengeId, normalizedOtp, env.JWT_SECRET);
  if (expected !== challenge.otpHash) {
    const next: AdminOtpChallenge = { ...challenge, attempts: challenge.attempts + 1 };
    await setAdminOtpChallenge(challengeId, next);
    const remaining = ADMIN_OTP_MAX_ATTEMPTS - next.attempts;
    return {
      ok: false,
      status: 401,
      error:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Sign in again to receive a new code.',
    };
  }

  await deleteAdminOtpChallenge(challengeId);
  const user = await loadUserById(challenge.userId);
  if (!user || user.role !== 'admin') {
    return { ok: false, status: 403, error: 'Admin access is not available for this account.' };
  }

  await setCachedUser({
    id: user.id,
    email: user.email,
    name: user.name,
    role: 'admin',
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'admin',
    },
  };
}
