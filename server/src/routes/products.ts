import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ProductModel } from '../models/Product.js';
import { ReviewModel } from '../models/Review.js';
import { productToJson } from '../utils/productJson.js';
import { requireAuth } from '../middleware/auth.js';
import { findPurchasedOrderForProduct } from '../utils/reviewQualification.js';

const router = Router();

const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(10).max(4000),
});

router.get('/', publicLimiter, async (req, res) => {
  const categoryRaw = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const subcategoryRaw =
    typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : '';
  const filter: Record<string, unknown> = { isActive: true };
  if (categoryRaw) {
    filter.category = new RegExp(`^${categoryRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }
  if (subcategoryRaw) {
    filter.subcategory = new RegExp(
      `^${subcategoryRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i',
    );
  }

  const list = await ProductModel.find(filter).sort({ createdAt: -1 }).lean();
  res.json({
    products: list.map((p) => productToJson(p)),
  });
});

/** List reviews + eligibility for the current user (optionalAuth on app). Must be registered before `GET /:id`. */
router.get('/:id/reviews', publicLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }
  const exists = await ProductModel.exists({ _id: id, isActive: true });
  if (!exists) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const skip = Math.max(0, parseInt(String(req.query.skip), 10) || 0);

  const [agg, reviews, total] = await Promise.all([
    ReviewModel.aggregate([
      { $match: { product: new Types.ObjectId(id) } },
      { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
    ]),
    ReviewModel.find({ product: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('rating title body reviewerName createdAt')
      .lean(),
    ReviewModel.countDocuments({ product: id }),
  ]);

  const row = agg[0];
  const summary = row
    ? {
        reviewCount: row.count as number,
        averageRating: Math.round((row.averageRating as number) * 10) / 10,
      }
    : { reviewCount: 0, averageRating: null as number | null };

  let viewer: { canSubmit: boolean; alreadyReviewed: boolean; delivered: boolean } | null = null;
  if (req.user) {
    const [existing, orderId] = await Promise.all([
      ReviewModel.findOne({ user: req.user.id, product: id }).select('_id').lean(),
      findPurchasedOrderForProduct(req.user.id, id),
    ]);
    viewer = {
      canSubmit: !existing && orderId != null,
      alreadyReviewed: !!existing,
      delivered: orderId != null,
    };
  }

  res.json({
    summary,
    reviews: reviews.map((r) => ({
      id: r._id.toString(),
      rating: r.rating,
      title: r.title,
      body: r.body,
      reviewerName: r.reviewerName,
      createdAt: r.createdAt,
    })),
    total,
    hasMore: skip + reviews.length < total,
    viewer,
  });
});

router.post('/:id/reviews', publicLimiter, requireAuth, async (req, res) => {
  let body: z.infer<typeof createReviewSchema>;
  try {
    body = createReviewSchema.parse(req.body);
  } catch {
    res.status(400).json({
      error: 'Invalid body: rating must be 1–5, review text must be 10–4000 characters.',
    });
    return;
  }

  const productId = String(req.params.id);
  if (!Types.ObjectId.isValid(productId)) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }

  const product = await ProductModel.findOne({ _id: productId, isActive: true }).select('_id').lean();
  if (!product) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const orderId = await findPurchasedOrderForProduct(req.user!.id, productId);
  if (!orderId) {
    res.status(403).json({
      error:
        'You can review this product only after your order has been marked delivered. Contact support if this is wrong.',
    });
    return;
  }

  try {
    const doc = await ReviewModel.create({
      user: new Types.ObjectId(req.user!.id),
      product: new Types.ObjectId(productId),
      order: orderId,
      rating: body.rating,
      title: body.title?.length ? body.title : undefined,
      body: body.body,
      reviewerName: (req.user!.name ?? '').trim() || 'Customer',
    });
    res.status(201).json({
      review: {
        id: doc._id.toString(),
        rating: doc.rating,
        title: doc.title,
        body: doc.body,
        reviewerName: doc.reviewerName,
        createdAt: doc.createdAt,
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: number }).code === 11000) {
      res.status(409).json({ error: 'You have already reviewed this product.' });
      return;
    }
    throw e;
  }
});

router.get('/:id', publicLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const pid = new Types.ObjectId(id);

  const [p, reviewAgg, viewerReview] = await Promise.all([
    ProductModel.findOne({ _id: pid, isActive: true }).lean(),
    ReviewModel.aggregate([
      { $match: { product: pid } },
      { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
    ]),
    req.user
      ? Promise.all([
          ReviewModel.exists({ user: req.user.id, product: pid }),
          findPurchasedOrderForProduct(req.user.id, id),
        ]).then(([hasReview, orderId]) => ({
          canSubmit: !hasReview && orderId != null,
          alreadyReviewed: !!hasReview,
          delivered: orderId != null,
        }))
      : Promise.resolve(null),
  ]);

  if (!p) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const base = productToJson(p);
  const ids = p.matchingBraceletIds ?? [];
  let matchingBracelets: ReturnType<typeof productToJson>[] = [];
  if (ids.length > 0) {
    const others = await ProductModel.find({ _id: { $in: ids }, isActive: true }).lean();
    const byId = new Map(others.map((o) => [String(o._id), o]));
    matchingBracelets = ids
      .map((bid) => byId.get(String(bid)))
      .filter((x): x is NonNullable<typeof x> => x != null)
      .map((row) => productToJson(row));
  }

  const row = reviewAgg[0];
  const reviewSummary = row
    ? {
        reviewCount: row.count as number,
        averageRating: Math.round((row.averageRating as number) * 10) / 10,
      }
    : { reviewCount: 0, averageRating: null as number | null };

  res.json({
    product: {
      ...base,
      matchingBracelets,
      reviewSummary,
      viewerReview,
    },
  });
});

export default router;
