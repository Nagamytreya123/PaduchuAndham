import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { z } from 'zod';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { ProductModel } from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { jewelleryComboToJson } from '../utils/jewelleryComboJson.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `combo-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth, requireAdmin);

const objectIdHex = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

function publicUrl(req: Request, filename: string): string {
  const base = env.SERVER_PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/uploads/${filename}`;
}

async function assertComboProducts(productIds: string[]): Promise<void> {
  const uniq = new Set(productIds);
  if (uniq.size !== productIds.length) {
    throw new Error('Duplicate product in combo');
  }
  if (productIds.length < 2) {
    throw new Error('Link at least two jewellery products');
  }
  const docs = await ProductModel.find({ _id: { $in: productIds } })
    .select('_id category isActive')
    .lean();
  if (docs.length !== productIds.length) {
    throw new Error('One or more products were not found');
  }
  for (const d of docs) {
    if (!d.isActive) {
      throw new Error('All linked products must be active');
    }
    if (String(d.category ?? '').trim().toLowerCase() !== 'jewellery') {
      throw new Error('Combo can only include Jewellery category products');
    }
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  images: z.array(z.string().url()).max(10).optional(),
  productIds: z.array(objectIdHex).min(2).max(24),
  price: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

router.get('/', async (_req, res) => {
  const list = await JewelleryComboModel.find().sort({ createdAt: -1 }).lean();
  res.json({ combos: list.map((c) => jewelleryComboToJson(c)) });
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
  if (body.price <= 0) {
    res.status(400).json({ error: 'Combo price must be greater than zero' });
    return;
  }
  try {
    await assertComboProducts(body.productIds);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid combo' });
    return;
  }
  const images = [...(body.images ?? [])];
  if (req.file) {
    images.unshift(publicUrl(req, req.file.filename));
  }
  if (images.length === 0) {
    res.status(400).json({ error: 'Add a combo image (URL or upload a file)' });
    return;
  }
  const doc = await JewelleryComboModel.create({
    name: body.name.trim(),
    images,
    productIds: body.productIds.map((id) => new mongoose.Types.ObjectId(id)),
    price: body.price,
    isActive: body.isActive ?? true,
    createdBy: req.user!.id,
  });
  await invalidateCatalogCache();
  res.status(201).json({ combo: jewelleryComboToJson(doc.toObject()) });
});

const updateSchema = createSchema.partial().extend({
  productIds: z.array(objectIdHex).min(2).max(24).optional(),
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
  const doc = await JewelleryComboModel.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const nextIds =
    patch.productIds !== undefined
      ? patch.productIds
      : (doc.productIds ?? []).map((id) => String(id));
  try {
    await assertComboProducts(nextIds);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid combo' });
    return;
  }

  if (patch.price !== undefined && patch.price <= 0) {
    res.status(400).json({ error: 'Combo price must be greater than zero' });
    return;
  }

  if (patch.name !== undefined) doc.name = patch.name.trim();
  if (patch.images !== undefined) doc.images = patch.images;
  if (patch.productIds !== undefined) {
    doc.productIds = patch.productIds.map((id) => new mongoose.Types.ObjectId(id));
  }
  if (patch.price !== undefined) doc.price = patch.price;
  if (patch.isActive !== undefined) doc.isActive = patch.isActive;
  if (req.file) {
    doc.images = [...(doc.images ?? []), publicUrl(req, req.file.filename)];
  }
  if (!doc.images || doc.images.length === 0) {
    res.status(400).json({ error: 'Combo must have at least one image (URL or upload)' });
    return;
  }
  await doc.save();
  await invalidateCatalogCache();
  res.json({ combo: jewelleryComboToJson(doc.toObject()) });
});

router.delete('/:id', async (req, res) => {
  const r = await JewelleryComboModel.findByIdAndDelete(req.params.id);
  if (!r) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await invalidateCatalogCache();
  res.json({ ok: true });
});

export default router;
