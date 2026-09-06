const DEFAULT_WHATSAPP_MESSAGE = 'Hello, I would like to get in touch about Paduchu Andham.';

/** Client fallback while settings load (optional Vite env). */
export function getClientSupportWhatsAppFallback(): string | null {
  const raw = import.meta.env.VITE_SUPPORT_WHATSAPP_MOBILE?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return null;
}

export function buildWhatsAppChatUrl(mobile: string, message = DEFAULT_WHATSAPP_MESSAGE): string {
  const digits = mobile.replace(/\D/g, '');
  const e164 = digits.length === 10 ? `91${digits}` : digits;
  const params = new URLSearchParams();
  if (message.trim()) params.set('text', message.trim());
  const query = params.toString();
  return `https://wa.me/${e164}${query ? `?${query}` : ''}`;
}

export function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function formatSupportPhoneDisplay(mobile: string): string {
  const digits = mobile.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits}` : mobile;
}
