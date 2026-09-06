import { Router } from 'express';
import { ReviewModel } from '../models/Review.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { isValidEntityId } from '../utils/entityId.js';

const router = Router();
router.use(requireAuth, requireAdmin);

type LeanUser = { _id: string; email?: string; name?: string };
type LeanProduct = { _id: string; name?: string; category?: string };
type LeanOrder = { _id: string; status?: string };

function isPopulatedUser(value: unknown): value is LeanUser {
  return value != null && typeof value === 'object' && 'email' in value;
}

function isPopulatedProduct(value: unknown): value is LeanProduct {
  return value != null && typeof value === 'object' && '_id' in value && 'name' in value;
}

function isPopulatedOrder(value: unknown): value is LeanOrder {
  return value != null && typeof value === 'object' && '_id' in value;
}

router.get('/', async (req, res) => {
  const limitRaw = parseInt(String(req.query.limit), 10);
  const limit = Number.isNaN(limitRaw) ? 50 : Math.min(100, Math.max(0, limitRaw));
  const skip = Math.max(0, parseInt(String(req.query.skip), 10) || 0);

  const productIdRaw = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  const match: Record<string, unknown> = {};
  if (productIdRaw && isValidEntityId(productIdRaw)) {
    match.product = productIdRaw;
  }

  const [total, avgRow, distrib, rows] = await Promise.all([
    ReviewModel.countDocuments(match),
    ReviewModel.aggregate([
      { $match: match },
      { $group: { _id: null as null, avg: { $avg: '$rating' } } },
    ]) as Promise<{ avg: number | null }[]>,
    ReviewModel.aggregate([
      { $match: match },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]) as Promise<{ _id: number; count: number }[]>,
    limit === 0
      ? Promise.resolve([])
      : ReviewModel.find(match)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'email name')
          .populate('product', 'name category')
          .populate('order', 'status createdAt')
          .lean(),
  ]);

  const byRating: Record<'1' | '2' | '3' | '4' | '5', number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  for (const d of distrib) {
    const k = String(d._id) as keyof typeof byRating;
    if (k in byRating) byRating[k] = d.count;
  }

  const avg = avgRow[0]?.avg;
  const summary = {
    total,
    averageRating: avg != null ? Math.round(avg * 10) / 10 : null as number | null,
    byRating,
  };

  res.json({
    summary,
    reviews: rows.map((r) => {
      const u = r.user;
      const p = r.product;
      const o = r.order;
      return {
        id: r._id.toString(),
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: r.reviewerName,
        createdAt: r.createdAt,
        user: isPopulatedUser(u) ? { email: u.email ?? '', name: u.name ?? '' } : null,
        product: isPopulatedProduct(p)
          ? {
              id: String(p._id),
              name: p.name ?? '—',
              category: p.category ?? '',
            }
          : null,
        order: isPopulatedOrder(o)
          ? {
              id: String(o._id),
              status: o.status ?? '',
            }
          : null,
      };
    }),
    hasMore: limit > 0 && skip + rows.length < total,
  });
});

export default router;
