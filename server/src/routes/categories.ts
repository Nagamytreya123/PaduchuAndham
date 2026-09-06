import { Router } from 'express';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';
import { setPublicCatalogCacheHeaders } from '../middleware/publicCacheHeaders.js';
import { cachedCatalog } from '../cache/catalog.js';
import { listPublicCategories } from '../services/categories.js';

const router = Router();

router.get('/', publicCatalogLimiter, async (_req, res) => {
  const { value, hit } = await cachedCatalog('categories:list', [], async () => ({
    categories: await listPublicCategories(),
  }));
  setPublicCatalogCacheHeaders(res, hit);
  res.json(value);
});

export default router;
