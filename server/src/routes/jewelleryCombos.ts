import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { ProductModel } from '../models/Product.js';
import { jewelleryComboToJson } from '../utils/jewelleryComboJson.js';
import { productToJson } from '../utils/productJson.js';

const router = Router();
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

router.get('/', publicLimiter, async (_req, res) => {
  const list = await JewelleryComboModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  res.json({
    combos: list.map((c) => jewelleryComboToJson(c)),
  });
});

router.get('/:id', publicLimiter, async (req, res) => {
  const c = await JewelleryComboModel.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!c) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const ids = (c.productIds ?? []).map((id) => String(id));
  const products =
    ids.length > 0
      ? await ProductModel.find({ _id: { $in: ids }, isActive: true }).lean()
      : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => x != null)
    .map((row) => productToJson(row));
  res.json({
    combo: { ...jewelleryComboToJson(c), products: ordered },
  });
});

export default router;
