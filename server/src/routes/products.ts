import { Router } from 'express';
import { z } from 'zod';
import { isValidEntityId } from '../utils/entityId.js';
import { ProductModel, type ProductDoc } from '../models/Product.js';
import { ReviewModel } from '../models/Review.js';
import { productToJson, productToListJson } from '../utils/productJson.js';
import { requireAuth } from '../middleware/auth.js';
import { findPurchasedOrderForProduct } from '../utils/reviewQualification.js';
import { publicCatalogLimiter } from '../middleware/rateLimit.js';
import { setPublicCatalogCacheHeaders } from '../middleware/publicCacheHeaders.js';
import {
  cachedCatalog,
  cachedProductPublic,
  cachedProductReviewsPage,
  invalidateCatalogForProductIds,
} from '../cache/catalog.js';
import {
  buildPriceRangeMongoFilter,
  buildProductListFilter,
  isStorefrontHiddenCategory,
  resolveStorefrontPriceFilter,
  storefrontHiddenCategoryFilter,
} from '../services/categories.js';
import { CategoryModel } from '../models/Category.js';
import { rankProductsBySearch } from '../utils/productSearch.js';
import { sortProductsByCreatedDesc } from '../utils/productSort.js';

const router = Router();

const ALLOWED_PAGE_SIZES = new Set([20, 30, 40]);

function parsePositiveInt(raw: unknown, fallback: number): number {
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parsePageSize(raw: unknown): number {
  const n = parseInt(String(raw), 10);
  return ALLOWED_PAGE_SIZES.has(n) ? n : 20;
}

function buildListMongoFilter(
  base: Record<string, unknown>,
  hidden: Record<string, unknown> | null,
  priceRange: Record<string, unknown> | null,
): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [base];
  if (hidden) parts.push(hidden);
  if (priceRange) parts.push(priceRange);
  return parts.length === 1 ? base : { $and: parts };
}

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(10).max(4000),
});

type ProductPublicCache = {
  base: ReturnType<typeof productToJson>;
  matchingBracelets: ReturnType<typeof productToJson>[];
  matchingWatches: Array<ReturnType<typeof productToJson> & { watchBraceletBundlePrice?: number }>;
  comboProducts: ReturnType<typeof productToJson>[];
  reviewSummary: { reviewCount: number; averageRating: number | null };
};

router.get('/', publicCatalogLimiter, async (req, res) => {
  const categoryRaw = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const subcategoryRaw =
    typeof req.query.subcategory === 'string' ? req.query.subcategory.trim() : '';
  const searchRaw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const priceFilterRaw =
    typeof req.query.priceFilter === 'string' ? req.query.priceFilter.trim() : '';
  const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePageSize(req.query.limit);

  const cacheSuffix = isPaginated ? 'products:list:paginated:v1' : 'products:list:created-desc:v3';
  const cacheParts = isPaginated
    ? [
        categoryRaw,
        subcategoryRaw,
        searchRaw.toLowerCase(),
        priceFilterRaw.toLowerCase(),
        String(page),
        String(limit),
      ]
    : [categoryRaw, subcategoryRaw, searchRaw.toLowerCase()];

  const { value, hit } = await cachedCatalog(cacheSuffix, cacheParts, async () => {
    const hidden = await storefrontHiddenCategoryFilter();
    const base = buildProductListFilter(categoryRaw, subcategoryRaw);
    const resolvedPriceFilter = priceFilterRaw
      ? await resolveStorefrontPriceFilter(categoryRaw, subcategoryRaw, priceFilterRaw)
      : null;
    const priceRange = resolvedPriceFilter
      ? buildPriceRangeMongoFilter(resolvedPriceFilter.minPaise, resolvedPriceFilter.maxPaise)
      : null;
    const filter = buildListMongoFilter(base, hidden, priceRange);

    const categoryRows = await CategoryModel.find({ isActive: true }).select('slug label').lean();
    const labelFor = (category: string) => {
      const key = category.trim().toLowerCase();
      const match = categoryRows.find(
        (row) => row.slug.toLowerCase() === key || row.label.toLowerCase() === key,
      );
      return match?.label;
    };

    if (!isPaginated) {
      const list = sortProductsByCreatedDesc(
        (await ProductModel.find(filter).lean()) as ProductDoc[],
      );
      let products = list.map((p) => productToListJson(p));
      if (searchRaw) {
        products = rankProductsBySearch(products, searchRaw, labelFor);
      }
      return { products };
    }

    if (searchRaw) {
      const list = sortProductsByCreatedDesc(
        (await ProductModel.find(filter).lean()) as ProductDoc[],
      );
      let products = list.map((p) => productToListJson(p));
      products = rankProductsBySearch(products, searchRaw, labelFor);
      const total = products.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const safePage = Math.min(page, totalPages);
      const skip = (safePage - 1) * limit;
      const pageProducts = products.slice(skip, skip + limit);
      return {
        products: pageProducts,
        pagination: {
          page: safePage,
          pageSize: limit,
          total,
          totalPages,
          hasNext: safePage < totalPages,
          hasPrev: safePage > 1,
        },
      };
    }

    const total = await ProductModel.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;
    const docs = await ProductModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const products = docs.map((p) => productToListJson(p as ProductDoc));
    return {
      products,
      pagination: {
        page: safePage,
        pageSize: limit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  });

  setPublicCatalogCacheHeaders(res, hit);
  res.json(value);
});

/** List reviews + eligibility for the current user (optionalAuth on app). Must be registered before `GET /:id`. */
router.get('/:id/reviews', publicCatalogLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isValidEntityId(id)) {
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

  const { value: publicPart, hit } = await cachedProductReviewsPage(id, limit, skip, async () => {
    const pid = id;
    const [agg, reviews, total] = await Promise.all([
      ReviewModel.aggregate([
        { $match: { product: pid } },
        { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
      ]),
      ReviewModel.find({ product: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id rating title body reviewerName createdAt')
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

    return {
      summary,
      reviews: reviews.map((r) => ({
        id: String(r._id),
        rating: r.rating,
        title: r.title,
        body: r.body,
        reviewerName: r.reviewerName,
        createdAt: r.createdAt,
      })),
      total,
      hasMore: skip + reviews.length < total,
    };
  });

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

  setPublicCatalogCacheHeaders(res, hit);
  res.json({ ...publicPart, viewer });
});

router.post('/:id/reviews', publicCatalogLimiter, requireAuth, async (req, res) => {
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
  if (!isValidEntityId(productId)) {
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
      user: req.user!.id,
      product: productId,
      order: orderId,
      rating: body.rating,
      title: body.title?.length ? body.title : undefined,
      body: body.body,
      reviewerName: (req.user!.name ?? '').trim() || 'Customer',
    });
    await invalidateCatalogForProductIds([productId]);
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

router.get('/:id/cover', publicCatalogLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isValidEntityId(id)) {
    res.status(404).end();
    return;
  }

  const product = await ProductModel.findOne({ _id: id, isActive: true }).select('images').lean();
  const image = product?.images?.[0];
  if (!image) {
    res.status(404).end();
    return;
  }

  if (image.startsWith('/uploads/') || image.startsWith('http://') || image.startsWith('https://')) {
    res.redirect(302, image);
    return;
  }

  const dataMatch = image.match(/^data:([^;]+);base64,(.+)$/);
  if (dataMatch) {
    const buf = Buffer.from(dataMatch[2], 'base64');
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(dataMatch[1]);
    res.send(buf);
    return;
  }

  res.status(404).end();
});

router.get('/:id', publicCatalogLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isValidEntityId(id)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const { value: cached, hit } = await cachedProductPublic(id, async (): Promise<ProductPublicCache | null> => {
    const pid = id;

    const [p, reviewAgg] = await Promise.all([
      ProductModel.findOne({ _id: pid, isActive: true }).lean(),
      ReviewModel.aggregate([
        { $match: { product: pid } },
        { $group: { _id: null, count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
      ]),
    ]);

    if (!p) return null;
    if (await isStorefrontHiddenCategory(String(p.category ?? ''))) return null;

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

    let matchingWatches: ProductPublicCache['matchingWatches'] = [];
    if (matchingBracelets.length === 0) {
      const parentWatches = await ProductModel.find({
        matchingBraceletIds: { $in: [pid] },
      }).lean();
      matchingWatches = parentWatches
        .filter((watch) => watch.isActive !== false)
        .map((watch) => ({
          ...productToJson(watch),
          watchBraceletBundlePrice:
            watch.watchBraceletBundlePrice == null ? undefined : watch.watchBraceletBundlePrice,
        }));
    }

    const comboIds = p.comboProductIds ?? [];
    let comboProducts: ReturnType<typeof productToJson>[] = [];
    if (comboIds.length > 0) {
      const others = await ProductModel.find({ _id: { $in: comboIds }, isActive: true }).lean();
      const byId = new Map(others.map((o) => [String(o._id), o]));
      comboProducts = comboIds
        .map((cid) => byId.get(String(cid)))
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

    return { base, matchingBracelets, matchingWatches, comboProducts, reviewSummary };
  });

  if (!cached) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const viewerReview = req.user
    ? await Promise.all([
        ReviewModel.exists({ user: req.user.id, product: id }),
        findPurchasedOrderForProduct(req.user.id, id),
      ]).then(([hasReview, orderId]) => ({
        canSubmit: !hasReview && orderId != null,
        alreadyReviewed: !!hasReview,
        delivered: orderId != null,
      }))
    : null;

  setPublicCatalogCacheHeaders(res, hit);
  res.json({
    product: {
      ...cached.base,
      matchingBracelets: cached.matchingBracelets,
      matchingWatches: cached.matchingWatches,
      comboProducts: cached.comboProducts,
      reviewSummary: cached.reviewSummary,
      viewerReview,
    },
  });
});

export default router;
