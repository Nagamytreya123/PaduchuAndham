import { Router } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { CartModel } from '../models/Cart.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const lineSchema = z.object({
  productId: z.string().regex(/^[a-f\d]{24}$/i),
  name: z.string().min(1).max(500),
  price: z.number().int().min(0),
  qty: z.number().int().min(1),
  image: z.string().max(2000).optional(),
});

const putBodySchema = z.object({
  items: z.array(lineSchema),
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const doc = await CartModel.findOne({ user: new Types.ObjectId(userId) }).lean();
  const items = (doc?.items ?? []).map((it) => ({
    productId: (it.productId as Types.ObjectId).toString(),
    name: it.name,
    price: it.price,
    qty: it.qty,
    image: it.image,
  }));
  res.json({ items });
});

router.put('/', async (req, res) => {
  let body: z.infer<typeof putBodySchema>;
  try {
    body = putBodySchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }

  const userId = req.user!.id;
  const items = body.items.map((it) => ({
    productId: new Types.ObjectId(it.productId),
    name: it.name,
    price: it.price,
    qty: it.qty,
    image: it.image,
  }));

  await CartModel.findOneAndUpdate(
    { user: new Types.ObjectId(userId) },
    { $set: { items }, $setOnInsert: { user: new Types.ObjectId(userId) } },
    { upsert: true, new: true },
  );

  res.json({ ok: true });
});

export default router;
