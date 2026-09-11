import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getAdminSiteSettings, updateSiteSettings } from '../services/siteSettings.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const patchSchema = z.object({
  homeScrollAnimationEnabled: z.boolean().optional(),
  supportWhatsAppMobile: z.string().nullable().optional(),
  socialInstagramUrl: z.string().nullable().optional(),
  socialYoutubeUrl: z.string().nullable().optional(),
  socialFacebookUrl: z.string().nullable().optional(),
  shippingChargePaise: z.number().int().min(0).optional(),
  freeShippingMinPaise: z.number().int().positive().nullable().optional(),
});

router.get('/', async (_req, res) => {
  const payload = await getAdminSiteSettings();
  res.json(payload);
});

router.patch('/', async (req, res) => {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  try {
    await updateSiteSettings(body);
    const payload = await getAdminSiteSettings();
    res.json(payload);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to save settings' });
  }
});

export default router;
