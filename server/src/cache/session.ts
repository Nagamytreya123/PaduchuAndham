import { SESSION_TTL_SEC, KEY_PREFIX } from './constants.js';
import { cacheDel, cacheGet, cacheSet } from './store.js';

export type CachedUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  avatarUrl?: string;
};

function sessionKey(userId: string): string {
  return `${KEY_PREFIX}:session:user:${userId}`;
}

export async function getCachedUser(userId: string): Promise<CachedUser | null> {
  return cacheGet<CachedUser>(sessionKey(userId));
}

export async function setCachedUser(user: CachedUser): Promise<void> {
  await cacheSet(sessionKey(user.id), user, SESSION_TTL_SEC);
}

export async function invalidateCachedUser(userId: string): Promise<void> {
  await cacheDel(sessionKey(userId));
}
