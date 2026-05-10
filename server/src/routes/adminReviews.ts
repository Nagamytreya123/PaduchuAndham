import { Router } from 'express';
import { Types } from 'mongoose';
import { ReviewModel } from '../models/Review.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

type LeanUser = { _id: Types.ObjectId; email?: string; name?: string };
type LeanProduct = { _id: Types.ObjectId; name?: string; category?: string };
type LeanOrder = { _id: Types.ObjectId; status?: string };

router.get('/', async (req, res) => {
  const limitRaw = parseInt(String(req.query.limit), 10);
  const limit = Number.isNaN(limitRaw) ? 50 : Math.min(100, Math.max(0, limitRaw));
  const skip = Math.max(0, parseInt(String(req.query.skip), 10) || 0);

  const productIdRaw = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  const match: Record<string, unknown> = {};
  if (productIdRaw && Types.ObjectId.isValid(productIdRaw)) {
    match.product = new Types.ObjectId(productIdRaw);
  }

  const [total, avgRow, distrib, rows] = await Promise.all([
    ReviewModel.countDocuments(match),
    ReviewModel.aggregate<{ avg: number | null }>([
      { $match: match },
      { $group: { _id: null as null, avg: { $avg: '$rating' } } },
    ]),
    ReviewModel.aggregate<{ _id: number; count: number }>([
      { $match: match },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
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
      const u = r.user as LeanUser | Types.ObjectId | undefined;
      const p = r.product as LeanProduct | Types.ObjectId | undefined;
      const o = r.order as LeanOrder | Types.ObjectId | undefined;
      return {
        id: r._id.toString(),
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: r.reviewerName,
        createdAt: r.createdAt,
        user:
          u && typeof u === 'object' && !(u instanceof Types.ObjectId) && 'email' in u
            ? { email: (u as LeanUser).email ?? '', name: (u as LeanUser).name ?? '' }
            : null,
        product:
          p && typeof p === 'object' && !(p instanceof Types.ObjectId) && '_id' in p
            ? {
                id: String((p as LeanProduct)._id),
                name: (p as LeanProduct).name ?? '—',
                category: (p as LeanProduct).category ?? '',
              }
            : null,
        order:
          o && typeof o === 'object' && !(o instanceof Types.ObjectId) && '_id' in o
            ? {
                id: String((o as LeanOrder)._id),
                status: (o as LeanOrder).status ?? '',
              }
            : null,
      };
    }),
    hasMore: limit > 0 && skip + rows.length < total,
  });
});

export default router;
