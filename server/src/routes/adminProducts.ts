import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { ProductModel } from '../models/Product.js';
import { OrderModel } from '../models/Order.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { productToJson } from '../utils/productJson.js';
import { uploadPublicPath } from '../utils/mediaUrl.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const MAX_PRODUCT_IMAGES = 15;

/** Multiple files as `images`; legacy single file field `image` still accepted. */
const productImageUpload = upload.fields([
  { name: 'images', maxCount: MAX_PRODUCT_IMAGES },
  { name: 'image', maxCount: 1 },
]);

const router = Router();
router.use(requireAuth, requireAdmin);

function collectUploadedImageUrls(req: { files?: unknown }): string[] {
  const out: string[] = [];
  const grouped = req.files as { images?: Express.Multer.File[]; image?: Express.Multer.File[] } | undefined;
  for (const f of grouped?.images ?? []) {
    out.push(uploadPublicPath(f.filename));
  }
  for (const f of grouped?.image ?? []) {
    out.push(uploadPublicPath(f.filename));
  }
  return out;
}

const dimensionsSchema = z
  .object({
    displayNote: z.string().max(300).optional(),
    lengthCm: z.number().min(0).optional(),
    widthCm: z.number().min(0).optional(),
    heightCm: z.number().min(0).optional(),
  })
  .optional();

const watchDetailsObjectSchema = z.object({
  caseShape: z.string().max(80).optional(),
  dial: z.string().max(120).optional(),
  strapType: z.string().max(80).optional(),
  color: z.string().max(80).optional(),
});

const watchDetailsSchema = watchDetailsObjectSchema.optional();

const jewelryDetailsBodySchema = z.object({
  materialType: z.string().max(120).optional(),
  finishOrPlating: z.string().max(120).optional(),
  stoneOrMotif: z.string().max(160).optional(),
  customizationNote: z.string().max(500).optional(),
});

const objectIdHex = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid product id');

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().int().min(0),
  stock: z.number().int().min(0),
  isActive: z.boolean().optional(),
  images: z.array(z.string().url()).max(15).optional(),
  category: z.string().min(1).max(80),
  subcategory: z.string().max(80).optional(),
  sku: z.string().max(64).optional(),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  materials: z.array(z.string().max(80)).max(30).optional(),
  tags: z.array(z.string().max(48)).max(40).optional(),
  dimensions: dimensionsSchema,
  weightGrams: z.number().min(0).optional(),
  careInstructions: z.string().max(2000).optional(),
  compareAtPrice: z.number().int().min(0).optional(),
  watchDetails: watchDetailsSchema,
  jewelryDetails: jewelryDetailsBodySchema.optional(),
  matchingBraceletIds: z.array(objectIdHex).max(24).optional(),
  watchBraceletBundlePrice: z.union([z.number().int().min(0), z.null()]).optional(),
});

router.post('/', productImageUpload, async (req, res) => {
  let body: z.infer<typeof createSchema>;
  try {
    const raw = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    body = createSchema.parse(raw);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const uploaded = collectUploadedImageUrls(req);
  const images = [...uploaded, ...(body.images ?? [])];
  if (images.length > MAX_PRODUCT_IMAGES) {
    res.status(400).json({ error: `Maximum ${MAX_PRODUCT_IMAGES} images per product` });
    return;
  }
  const product = await ProductModel.create({
    name: body.name,
    description: body.description ?? '',
    price: body.price,
    stock: body.stock,
    isActive: body.isActive ?? true,
    images,
    category: body.category,
    subcategory: body.subcategory,
    sku: body.sku,
    slug: body.slug,
    materials: body.materials ?? [],
    tags: body.tags ?? [],
    dimensions: body.dimensions,
    weightGrams: body.weightGrams,
    careInstructions: body.careInstructions,
    compareAtPrice: body.compareAtPrice,
    watchDetails: body.watchDetails,
    jewelryDetails: body.jewelryDetails,
    matchingBraceletIds: body.matchingBraceletIds?.map((id) => new mongoose.Types.ObjectId(id)),
    watchBraceletBundlePrice: body.watchBraceletBundlePrice ?? undefined,
    createdBy: req.user!.id,
  });
  await invalidateCatalogCache();
  res.status(201).json({ product: productToJson(product.toObject()) });
});

const updateSchema = createSchema.partial().extend({
  watchDetails: z.union([watchDetailsObjectSchema, z.null()]).optional(),
  jewelryDetails: z.union([jewelryDetailsBodySchema, z.null()]).optional(),
});

/** Orders that count toward “sold” units (payment captured / fulfilment). */
const COUNTED_SALE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'] as const;

async function loadSalesAggregates() {
  const perProduct = await OrderModel.aggregate<{ _id: mongoose.Types.ObjectId; units: number }>([
    { $match: { status: { $in: [...COUNTED_SALE_STATUSES] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        units: { $sum: '$items.qty' },
      },
    },
  ]);

  const byProductId = new Map<string, number>();
  let totalUnitsSold = 0;
  for (const row of perProduct) {
    const id = String(row._id);
    byProductId.set(id, row.units);
    totalUnitsSold += row.units;
  }

  const bySubRows = await OrderModel.aggregate<{ _id: string | null; units: number }>([
    { $match: { status: { $in: [...COUNTED_SALE_STATUSES] } } },
    { $unwind: '$items' },
    {
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'prod',
      },
    },
    { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$prod.subcategory',
        units: { $sum: '$items.qty' },
      },
    },
  ]);

  const bySubcategory: Record<string, number> = {};
  for (const row of bySubRows) {
    const key =
      row._id != null && String(row._id).trim() !== '' ? String(row._id) : 'Uncategorized';
    bySubcategory[key] = (bySubcategory[key] ?? 0) + row.units;
  }

  return { byProductId, bySubcategory, totalUnitsSold };
}

router.get('/', async (_req, res) => {
  const { byProductId, bySubcategory, totalUnitsSold } = await loadSalesAggregates();
  const list = await ProductModel.find().sort({ createdAt: -1 }).lean();
  res.json({
    products: list.map((p) => ({
      ...productToJson(p),
      unitsSold: byProductId.get(String(p._id)) ?? 0,
    })),
    salesSummary: {
      totalUnitsSold,
      bySubcategory,
    },
  });
});

router.patch('/:id', productImageUpload, async (req, res) => {
  let patch: z.infer<typeof updateSchema>;
  try {
    const raw = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    patch = updateSchema.parse(raw);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const doc = await ProductModel.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (patch.name !== undefined) doc.name = patch.name;
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.price !== undefined) doc.price = patch.price;
  if (patch.stock !== undefined) doc.stock = patch.stock;
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;
  if (patch.images !== undefined) doc.images = patch.images;
  if (patch.category !== undefined) doc.category = patch.category;
  if (patch.subcategory !== undefined) doc.subcategory = patch.subcategory;
  if (patch.sku !== undefined) doc.sku = patch.sku;
  if (patch.slug !== undefined) doc.slug = patch.slug;
  if (patch.materials !== undefined) doc.materials = patch.materials;
  if (patch.tags !== undefined) doc.tags = patch.tags;
  if (patch.dimensions !== undefined) doc.dimensions = patch.dimensions ?? undefined;
  if (patch.weightGrams !== undefined) doc.weightGrams = patch.weightGrams;
  if (patch.careInstructions !== undefined) doc.careInstructions = patch.careInstructions;
  if (patch.compareAtPrice !== undefined) doc.compareAtPrice = patch.compareAtPrice;
  if (patch.watchDetails === null) doc.set('watchDetails', undefined);
  else if (patch.watchDetails !== undefined) doc.watchDetails = patch.watchDetails;
  if (patch.jewelryDetails === null) doc.set('jewelryDetails', undefined);
  else if (patch.jewelryDetails !== undefined) doc.jewelryDetails = patch.jewelryDetails;
  if (patch.matchingBraceletIds !== undefined) {
    doc.matchingBraceletIds = patch.matchingBraceletIds.map((id) => new mongoose.Types.ObjectId(id));
  }
  if (patch.watchBraceletBundlePrice !== undefined) {
    if (patch.watchBraceletBundlePrice === null) {
      doc.set('watchBraceletBundlePrice', undefined);
    } else {
      doc.watchBraceletBundlePrice = patch.watchBraceletBundlePrice;
    }
  }
  const uploaded = collectUploadedImageUrls(req);
  if (uploaded.length > 0) {
    doc.images = [...(doc.images ?? []), ...uploaded];
  }
  if ((doc.images?.length ?? 0) > MAX_PRODUCT_IMAGES) {
    res.status(400).json({ error: `Maximum ${MAX_PRODUCT_IMAGES} images per product` });
    return;
  }
  await doc.save();
  await invalidateCatalogCache();
  res.json({ product: productToJson(doc.toObject()) });
});

router.delete('/:id', async (req, res) => {
  const r = await ProductModel.findByIdAndDelete(req.params.id);
  if (!r) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await invalidateCatalogCache();
  res.json({ ok: true });
});

export default router;
