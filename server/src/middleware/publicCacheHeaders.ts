import type { Response } from 'express';
import { CATALOG_TTL_SEC } from '../cache/constants.js';

/** Browser + CDN cache for public catalog JSON (matches Redis TTL). */
export function setPublicCatalogCacheHeaders(res: Response, hit: boolean): void {
  res.setHeader('Cache-Control', `public, max-age=60, stale-while-revalidate=${CATALOG_TTL_SEC}`);
  res.setHeader('Vary', 'Accept-Encoding');
  res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
}
