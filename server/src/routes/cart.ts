import { Router } from 'express';
import { z } from 'zod';
import { CartModel } from '../models/Cart.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const lineSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.string().min(1).max(500),
  price: z.coerce.number().int().min(0),
  qty: z.coerce.number().int().min(1),
  image: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => {
      const t = val?.trim();
      if (!t || t.startsWith('data:')) return undefined;
      return t;
    }),
  bundleGroupId: z.string().min(1).max(200).optional(),
  bundleDisplayName: z.string().min(1).max(500).optional(),
  bundleUnitTotalPaise: z.coerce.number().int().min(0).optional(),
  bundleImage: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => {
      const t = val?.trim();
      if (!t || t.startsWith('data:')) return undefined;
      return t;
    }),
});

const putBodySchema = z.object({
  items: z.array(lineSchema),
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const doc = await CartModel.findOne({ user: userId });
  const items = (doc?.items ?? []).map((it) => ({
    productId: String(it.productId),
    name: it.name,
    price: it.price,
    qty: it.qty,
    image: it.image,
    bundleGroupId: it.bundleGroupId,
    bundleDisplayName: it.bundleDisplayName,
    bundleUnitTotalPaise: it.bundleUnitTotalPaise,
    bundleImage: it.bundleImage,
  }));
  res.json({ items });
});

router.put('/', async (req, res) => {
  let body: z.infer<typeof putBodySchema>;
  try {
    body = putBodySchema.parse(req.body);
  } catch (err) {
    console.warn('[cart] invalid body', err);
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const userId = req.user!.id;
  const items = body.items.map((it) => ({
    productId: it.productId,
    name: it.name,
    price: it.price,
    qty: it.qty,
    image: it.image,
    bundleGroupId: it.bundleGroupId,
    bundleDisplayName: it.bundleDisplayName,
    bundleUnitTotalPaise: it.bundleUnitTotalPaise,
    bundleImage: it.bundleImage,
  }));

  await CartModel.findOneAndUpdate(
    { user: userId },
    { $set: { items }, $setOnInsert: { user: userId } },
    { upsert: true, new: true },
  );

  res.json({ ok: true });
});

export default router;
