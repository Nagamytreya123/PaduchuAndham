import { isRedisCacheEnabled, getRedis } from '../redis/client.js';

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisCacheEnabled()) return null;
  try {
    const raw = await getRedis().get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('[cache] get failed', key, err);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isRedisCacheEnabled()) return;
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('[cache] set failed', key, err);
  }
}

/** Read-through cache; on Redis failure runs loader directly. */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return { value: cached, hit: true };
  }
  const value = await loader();
  void cacheSet(key, value, ttlSeconds);
  return { value, hit: false };
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!isRedisCacheEnabled() || keys.length === 0) return;
  try {
    await getRedis().del(...keys);
  } catch (err) {
    console.error('[cache] del failed', err);
  }
}
