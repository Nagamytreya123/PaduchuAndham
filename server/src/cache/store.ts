import { isRedisCacheEnabled, getRedis } from '../redis/client.js';

type MemEntry = { value: unknown; exp: number; version: string };

/** In-process fallback when REDIS_URL is unset — same read-through pattern as Redis. */
const memoryStore = new Map<string, MemEntry>();
let memoryCatalogVersion = '1';

export function bumpMemoryCatalogVersion(): void {
  memoryCatalogVersion = String(Date.now());
}

export function getMemoryCatalogVersion(): string {
  return memoryCatalogVersion;
}

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

function memoryGet<T>(key: string): T | null {
  const row = memoryStore.get(key);
  if (!row) return null;
  if (row.exp <= Date.now() || row.version !== memoryCatalogVersion) {
    memoryStore.delete(key);
    return null;
  }
  return row.value as T;
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  memoryStore.set(key, {
    value,
    exp: Date.now() + ttlSeconds * 1000,
    version: memoryCatalogVersion,
  });
}

/** Read-through cache; falls back to in-memory when Redis is disabled. */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  if (isRedisCacheEnabled()) {
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
      return { value: cached, hit: true };
    }
    const value = await loader();
    void cacheSet(key, value, ttlSeconds);
    return { value, hit: false };
  }

  const mem = memoryGet<T>(key);
  if (mem !== null) {
    return { value: mem, hit: true };
  }
  const value = await loader();
  memorySet(key, value, ttlSeconds);
  return { value, hit: false };
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!isRedisCacheEnabled()) {
    for (const key of keys) memoryStore.delete(key);
    return;
  }
  if (keys.length === 0) return;
  try {
    await getRedis().del(...keys);
  } catch (err) {
    console.error('[cache] del failed', err);
  }
}
