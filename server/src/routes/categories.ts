import { Router } from 'express';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';
import { cachedCatalog } from '../cache/catalog.js';
import { listPublicCategories } from '../services/categories.js';

const router = Router();

router.get('/', publicCatalogLimiter, async (_req, res) => {
  const { value, hit } = await cachedCatalog('categories:list', [], async () => ({
    categories: await listPublicCategories(),
  }));
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Cache', hit ? 'HIT' : 'MISS');
  }
  res.json(value);
});

export default router;
