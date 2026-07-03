import { Router } from 'express';
import { getSiteSettings } from '../services/siteSettings.js';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', publicCatalogLimiter, async (_req, res) => {
  const settings = await getSiteSettings();
  res.json({ settings });
});

export default router;
