import { Router } from 'express';
import { z } from 'zod';
import { WishlistModel } from '../models/Wishlist.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const itemSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  price: z.coerce.number().int().min(0),
  image: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => {
      const t = val?.trim();
      if (!t || t.startsWith('data:')) return '';
      return t;
    }),
  subtitle: z.string().max(500).optional(),
  href: z.string().min(1).max(500),
  savedAt: z.coerce.number().int().min(0),
});

const putBodySchema = z.object({
  items: z.array(itemSchema).max(200),
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const doc = await WishlistModel.findOne({ user: userId });
  const items = (doc?.items ?? []).map((it) => ({
    id: it.id,
    name: it.name,
    price: it.price,
    image: it.image || undefined,
    subtitle: it.subtitle || undefined,
    href: it.href,
    savedAt: it.savedAt,
  }));
  res.json({ items });
});

router.put('/', async (req, res) => {
  let body: z.infer<typeof putBodySchema>;
  try {
    body = putBodySchema.parse(req.body);
  } catch (err) {
    console.warn('[wishlist] invalid body', err);
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const userId = req.user!.id;
  const items = body.items.map((it) => ({
    id: it.id,
    name: it.name,
    price: it.price,
    image: it.image ?? '',
    subtitle: it.subtitle ?? '',
    href: it.href,
    savedAt: it.savedAt,
  }));

  await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $set: { items }, $setOnInsert: { user: userId } },
    { upsert: true, new: true },
  );

  res.json({ ok: true });
});

export default router;
