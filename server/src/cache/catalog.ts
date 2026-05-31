import { createHash } from 'node:crypto';
import { CATALOG_TTL_SEC, CATALOG_VERSION_KEY, KEY_PREFIX } from './constants.js';
import { getOrSet } from './store.js';
import {
  getRedis,
  isRedisCacheEnabled,
  newCatalogVersionToken,
} from '../redis/client.js';

async function getCatalogVersion(): Promise<string> {
  if (!isRedisCacheEnabled()) return '0';
  try {
    const v = await getRedis().get(CATALOG_VERSION_KEY);
    return v ?? '1';
  } catch {
    return '1';
  }
}

function catalogKey(suffix: string, version: string): string {
  return `${KEY_PREFIX}:catalog:v${version}:${suffix}`;
}

function hashQuery(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

/** Bump version so all catalog:* keys become stale without SCAN or INCR. */
export async function invalidateCatalogCache(): Promise<void> {
  if (!isRedisCacheEnabled()) return;
  try {
    await getRedis().set(CATALOG_VERSION_KEY, newCatalogVersionToken());
  } catch (err) {
    console.error('[cache] catalog version bump failed', err);
  }
}

export async function invalidateCatalogForProductIds(_productIds: string[]): Promise<void> {
  await invalidateCatalogCache();
}

export async function cachedCatalog<T>(
  suffix: string,
  queryParts: string[],
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  if (!isRedisCacheEnabled()) {
    const value = await loader();
    return { value, hit: false };
  }
  const version = await getCatalogVersion();
  const key = catalogKey(`${suffix}:${hashQuery(queryParts)}`, version);
  return getOrSet(key, CATALOG_TTL_SEC, loader);
}

export async function cachedProductPublic<T>(
  productId: string,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  return cachedCatalog(`product:${productId}:public`, [productId], loader);
}

export async function cachedProductReviewsPage<T>(
  productId: string,
  limit: number,
  skip: number,
  loader: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  return cachedCatalog(`reviews:${productId}`, [productId, String(limit), String(skip)], loader);
}

/** Read current catalog version (health/metrics). */
export async function readCatalogVersion(): Promise<string | null> {
  if (!isRedisCacheEnabled()) return null;
  try {
    return await getRedis().get(CATALOG_VERSION_KEY);
  } catch {
    return null;
  }
}
