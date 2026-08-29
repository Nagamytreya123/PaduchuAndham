import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

/** Share session cookie across apex + www (e.g. paduchuandham.com and www.paduchuandham.com). */
export function authCookieDomain(): string | undefined {
  if (env.NODE_ENV !== 'production') return undefined;
  try {
    const host = new URL(env.CLIENT_URL).hostname;
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.amazonaws.com') ||
      host.endsWith('.cloudfront.net')
    ) {
      return undefined;
    }
    const parts = host.split('.');
    if (parts.length < 2) return undefined;
    return `.${parts.slice(-2).join('.')}`;
  } catch {
    return undefined;
  }
}

function crossOriginCookiesEnabled(): boolean {
  return process.env.CROSS_ORIGIN_COOKIES === 'true';
}

export function authCookieOptions(maxAge: number): CookieOptions {
  const domain = authCookieDomain();
  const sameSite = crossOriginCookiesEnabled() ? 'none' : 'lax';
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite,
    maxAge,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  const domain = authCookieDomain();
  return {
    path: '/',
    ...(domain ? { domain } : {}),
  };
}
