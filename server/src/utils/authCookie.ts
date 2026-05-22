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
      host.endsWith('.vercel.app')
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

export function authCookieOptions(maxAge: number): CookieOptions {
  const domain = authCookieDomain();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
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
