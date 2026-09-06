import { env } from '../config/env.js';

const FALLBACK_MOBILE = '9392824278';

/** Normalize to 10-digit Indian mobile (no country code). */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return null;
}

export function getSupportWhatsAppEnvDefault(): string {
  const fromEnv = env.SUPPORT_WHATSAPP_MOBILE?.trim();
  if (!fromEnv) return FALLBACK_MOBILE;
  return normalizeIndianMobile(fromEnv) ?? FALLBACK_MOBILE;
}

export function formatIndianMobileDisplay(mobile: string): string {
  const normalized = normalizeIndianMobile(mobile);
  return normalized ?? mobile;
}
