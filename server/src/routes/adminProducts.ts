import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { productToJson } from '../utils/productJson.js';

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

const router = Router();
router.use(requireAuth, requireAdmin);

function publicUrl(req: Request, filename: string): string {
  const base = env.SERVER_PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/${filename}`;
}

const dimensionsSchema = z
  .object({
    displayNote: z.string().max(300).optional(),
    lengthCm: z.number().min(0).optional(),
    widthCm: z.number().min(0).optional(),
    heightCm: z.number().min(0).optional(),
  })
  .optional();

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
  tags: z.array(z.string().max(40)).max(30).optional(),
  materials: z.array(z.string().max(80)).max(30).optional(),
  dimensions: dimensionsSchema,
  weightGrams: z.number().min(0).optional(),
  careInstructions: z.string().max(2000).optional(),
  compareAtPrice: z.number().int().min(0).optional(),
});

router.post('/', upload.single('image'), async (req, res) => {
  let body: z.infer<typeof createSchema>;
  try {
    const raw = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    body = createSchema.parse(raw);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const images = [...(body.images ?? [])];
  if (req.file) {
    images.unshift(publicUrl(req, req.file.filename));
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
    tags: body.tags ?? [],
    materials: body.materials ?? [],
    dimensions: body.dimensions,
    weightGrams: body.weightGrams,
    careInstructions: body.careInstructions,
    compareAtPrice: body.compareAtPrice,
    createdBy: req.user!.id,
  });
  res.status(201).json({ product: productToJson(product.toObject()) });
});

const updateSchema = createSchema.partial();

router.get('/', async (_req, res) => {
  const list = await ProductModel.find().sort({ createdAt: -1 }).lean();
  res.json({
    products: list.map((p) => productToJson(p)),
  });
});

router.patch('/:id', upload.single('image'), async (req, res) => {
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
  if (patch.tags !== undefined) doc.tags = patch.tags;
  if (patch.materials !== undefined) doc.materials = patch.materials;
  if (patch.dimensions !== undefined) doc.dimensions = patch.dimensions ?? undefined;
  if (patch.weightGrams !== undefined) doc.weightGrams = patch.weightGrams;
  if (patch.careInstructions !== undefined) doc.careInstructions = patch.careInstructions;
  if (patch.compareAtPrice !== undefined) doc.compareAtPrice = patch.compareAtPrice;
  if (req.file) {
    doc.images = [...(doc.images ?? []), publicUrl(req, req.file.filename)];
  }
  await doc.save();
  res.json({ product: productToJson(doc.toObject()) });
});

router.delete('/:id', async (req, res) => {
  const r = await ProductModel.findByIdAndDelete(req.params.id);
  if (!r) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ ok: true });
});

export default router;
