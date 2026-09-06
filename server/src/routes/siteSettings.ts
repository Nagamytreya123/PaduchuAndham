import { Router } from 'express';
import { getSiteSettingsCached } from '../services/siteSettings.js';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';
import { setPublicCatalogCacheHeaders } from '../middleware/publicCacheHeaders.js';

const router = Router();

router.get('/', publicCatalogLimiter, async (_req, res) => {
  const { settings, hit } = await getSiteSettingsCached();
  setPublicCatalogCacheHeaders(res, hit);
  res.json({ settings });
});

export default router;
