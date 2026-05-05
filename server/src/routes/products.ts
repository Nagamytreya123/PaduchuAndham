import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ProductModel } from '../models/Product.js';
import { productToJson } from '../utils/productJson.js';

const router = Router();

const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

router.get('/', publicLimiter, async (req, res) => {
  const categoryRaw = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const filter: Record<string, unknown> = { isActive: true };
  if (categoryRaw) {
    filter.category = new RegExp(`^${categoryRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  const list = await ProductModel.find(filter).sort({ createdAt: -1 }).lean();
  res.json({
    products: list.map((p) => productToJson(p)),
  });
});

router.get('/:id', publicLimiter, async (req, res) => {
  const p = await ProductModel.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!p) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    product: productToJson(p),
  });
});

export default router;
