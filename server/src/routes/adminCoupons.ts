import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  CouponServiceError,
  createCoupon,
  deleteCoupon,
  listAdminCoupons,
  updateCoupon,
} from '../services/coupon.js';
import { serializePublicPromotion, resolvePerUserLimit } from '../utils/coupon.js';
import type { CouponDoc } from '../models/Coupon.js';

const router = Router();
router.use(requireAuth, requireAdmin);

function sendCouponError(res: import('express').Response, err: unknown, fallback: string) {
  if (err instanceof CouponServiceError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  console.error('[admin/coupons]', fallback, err);
  res.status(500).json({ error: fallback });
}

function serializeAdminCoupon(coupon: CouponDoc) {
  const promo = serializePublicPromotion(coupon);
  return {
    ...promo,
    isActive: coupon.isActive !== false,
    perUserLimit: resolvePerUserLimit(coupon),
    expiresAt: coupon.expiresAt ?? null,
    categorySlugs: coupon.categorySlugs ?? [],
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

router.get('/', async (_req, res) => {
  try {
    const coupons = await listAdminCoupons();
    res.json({ coupons: coupons.map(serializeAdminCoupon) });
  } catch (err) {
    sendCouponError(res, err, 'Could not load coupons');
  }
});

const couponBodySchema = z.object({
  code: z.string().min(3).max(24),
  label: z.string().max(80).optional(),
  discountType: z.enum(['percent', 'fixed']),
  percentOff: z.number().min(1).max(100).optional(),
  fixedOffPaise: z.number().int().min(1).optional(),
  minSubtotalPaise: z.number().int().min(0),
  maxDiscountPaise: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  perUserLimit: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  categorySlugs: z.array(z.string().min(1).max(80)).max(32).optional(),
});

router.post('/', async (req, res) => {
  let body: z.infer<typeof couponBodySchema>;
  try {
    body = couponBodySchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid coupon data' });
    return;
  }
  try {
    const coupon = await createCoupon(body);
    res.status(201).json({ coupon: serializeAdminCoupon(coupon) });
  } catch (err) {
    sendCouponError(res, err, 'Could not create coupon');
  }
});

const patchSchema = couponBodySchema.partial();

router.patch('/:id', async (req, res) => {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid coupon update' });
    return;
  }
  if (Object.keys(body).length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  try {
    const coupon = await updateCoupon(String(req.params.id), body);
    res.json({ coupon: serializeAdminCoupon(coupon) });
  } catch (err) {
    sendCouponError(res, err, 'Could not update coupon');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteCoupon(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    sendCouponError(res, err, 'Could not delete coupon');
  }
});

export default router;
