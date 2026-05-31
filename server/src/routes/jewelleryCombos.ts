import { Router } from 'express';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { ProductModel } from '../models/Product.js';
import { jewelleryComboToJson } from '../utils/jewelleryComboJson.js';
import { productToJson } from '../utils/productJson.js';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';
import { cachedCatalog } from '../cache/catalog.js';

const router = Router();

router.get('/', publicCatalogLimiter, async (_req, res) => {
  const { value } = await cachedCatalog('combos:all', ['all'], async () => {
    const list = await JewelleryComboModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    return {
      combos: list.map((c) => jewelleryComboToJson(c)),
    };
  });
  res.json(value);
});

router.get('/:id', publicCatalogLimiter, async (req, res) => {
  const id = String(req.params.id);
  const { value, hit } = await cachedCatalog(`combo:${id}`, [id], async () => {
    const c = await JewelleryComboModel.findOne({ _id: id, isActive: true }).lean();
    if (!c) return null;

    const ids = (c.productIds ?? []).map((pid) => String(pid));
    const products =
      ids.length > 0
        ? await ProductModel.find({ _id: { $in: ids }, isActive: true }).lean()
        : [];
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const ordered = ids
      .map((pid) => byId.get(pid))
      .filter((x): x is NonNullable<typeof x> => x != null)
      .map((row) => productToJson(row));
    return {
      combo: { ...jewelleryComboToJson(c), products: ordered },
    };
  });

  if (value == null) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (process.env.NODE_ENV === 'development' && hit) {
    res.setHeader('X-Cache', 'HIT');
  }
  res.json(value);
});

export default router;
