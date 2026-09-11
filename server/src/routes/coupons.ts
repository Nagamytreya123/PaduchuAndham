import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  CouponServiceError,
  listActivePromotions,
  validateCouponForCheckout,
} from '../services/coupon.js';

const router = Router();

const promotionsSchema = z.object({
  subtotalPaise: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).optional(),
        unitPricePaise: z.number().int().min(0).optional(),
        bundleGroupId: z.string().max(200).optional(),
      }),
    )
    .optional(),
});

router.get('/promotions', async (req, res) => {
  try {
    const promotions = await listActivePromotions(req.user?.id);
    res.json({ promotions });
  } catch (err) {
    console.error('[coupons/promotions]', err);
    res.status(500).json({ error: 'Could not load promotions' });
  }
});

router.post('/promotions', async (req, res) => {
  let body: z.infer<typeof promotionsSchema>;
  try {
    body = promotionsSchema.parse(req.body ?? {});
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  try {
    const promotions = await listActivePromotions(req.user?.id, body.items, body.subtotalPaise);
    res.json({ promotions });
  } catch (err) {
    console.error('[coupons/promotions]', err);
    res.status(500).json({ error: 'Could not load promotions' });
  }
});

const validateSchema = z.object({
  code: z.string().min(1).max(32),
  subtotalPaise: z.number().int().min(0),
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).optional(),
        unitPricePaise: z.number().int().min(0).optional(),
        bundleGroupId: z.string().max(200).optional(),
      }),
    )
    .optional(),
});

router.post('/validate', requireAuth, async (req, res) => {
  let body: z.infer<typeof validateSchema>;
  try {
    body = validateSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  try {
    const result = await validateCouponForCheckout(
      body.code,
      body.subtotalPaise,
      req.user!.id,
      body.items,
    );
    res.json({ coupon: result });
  } catch (err) {
    if (err instanceof CouponServiceError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    console.error('[coupons/validate]', err);
    res.status(500).json({ error: 'Could not validate coupon' });
  }
});

export default router;
