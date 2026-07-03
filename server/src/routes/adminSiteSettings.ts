import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSiteSettings, updateSiteSettings } from '../services/siteSettings.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const patchSchema = z.object({
  homeScrollAnimationEnabled: z.boolean().optional(),
});

router.get('/', async (_req, res) => {
  const settings = await getSiteSettings();
  res.json({ settings });
});

router.patch('/', async (req, res) => {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const settings = await updateSiteSettings(body);
  res.json({ settings });
});

export default router;
