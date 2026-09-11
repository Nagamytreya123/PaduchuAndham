import { env } from '../config/env.js';

export type SocialPlatform = 'instagram' | 'youtube' | 'facebook';

const FALLBACKS: Record<SocialPlatform, string | null> = {
  instagram: 'https://www.instagram.com/paduchu_andham_jewellery/',
  youtube: null,
  facebook: null,
};

export function normalizeSocialUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getSocialLinkEnvDefault(platform: SocialPlatform): string | null {
  const fromEnv = {
    instagram: env.SOCIAL_INSTAGRAM_URL?.trim(),
    youtube: env.SOCIAL_YOUTUBE_URL?.trim(),
    facebook: env.SOCIAL_FACEBOOK_URL?.trim(),
  }[platform];

  if (fromEnv) {
    return normalizeSocialUrl(fromEnv) ?? FALLBACKS[platform];
  }
  return FALLBACKS[platform];
}
