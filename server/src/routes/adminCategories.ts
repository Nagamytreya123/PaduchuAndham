import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { invalidateCatalogCache } from '../cache/catalog.js';
import { persistUploadedMulterFiles } from '../utils/productImageStorage.js';
import { createImageUpload, withMulter } from '../middleware/multerUpload.js';
import {
  CategoryServiceError,
  addSubcategory,
  createCategoryFromLabel,
  deleteCategory,
  deleteSubcategory,
  listAdminCategories,
  renameSubcategory,
  updateCategory,
} from '../services/categories.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const upload = createImageUpload();
const tileImageUpload = withMulter(upload, [{ name: 'image', maxCount: 1 }]);

router.get('/', async (_req, res) => {
  try {
    const categories = await listAdminCategories();
    res.json({ categories });
  } catch (err) {
    sendCategoryError(res, err, 'Could not load categories');
  }
});

const createSchema = z.object({
  label: z.string().min(2).max(80),
});

const priceFilterSchema = z.object({
  id: z.string().max(80).optional(),
  label: z.string().min(1).max(80),
  minPaise: z.number().int().min(0).nullable().optional(),
  maxPaise: z.number().int().min(0).nullable().optional(),
  subcategory: z.string().max(80).nullable().optional(),
});

const patchSchema = z.object({
  label: z.string().min(2).max(80).optional(),
  tileImageUrl: z.string().nullable().optional(),
  priceFilters: z.array(priceFilterSchema).max(30).optional(),
  priceFiltersEnabled: z.boolean().optional(),
  isCombo: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

function sendCategoryError(res: import('express').Response, err: unknown, fallback: string) {
  if (err instanceof CategoryServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error('[admin/categories]', fallback, err);
  res.status(500).json({ error: fallback });
}

router.post('/', async (req, res) => {
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  try {
    const category = await createCategoryFromLabel(body.label);
    await invalidateCatalogCache();
    res.status(201).json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not create category');
  }
});

router.patch('/:slug', async (req, res) => {
  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid category update' });
    return;
  }
  if (
    body.label === undefined &&
    body.tileImageUrl === undefined &&
    body.priceFilters === undefined &&
    body.priceFiltersEnabled === undefined &&
    body.isCombo === undefined &&
    body.isActive === undefined
  ) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  try {
    const category = await updateCategory(String(req.params.slug), body);
    await invalidateCatalogCache();
    res.json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not update category');
  }
});

router.post('/:slug/image', tileImageUpload, async (req, res) => {
  try {
    const grouped = req.files as { image?: Express.Multer.File[] } | undefined;
    const files = grouped?.image ?? [];
    const uploaded = files.length > 0 ? await persistUploadedMulterFiles(files) : [];
    const imageUrl = uploaded[0];
    if (!imageUrl) {
      res.status(400).json({ error: 'Choose an image file to upload' });
      return;
    }
    const slug = String(req.params.slug);
    const category = await updateCategory(slug, { tileImageUrl: imageUrl });
    await invalidateCatalogCache();
    res.json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not upload category image');
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const result = await deleteCategory(String(req.params.slug));
    await invalidateCatalogCache();
    res.json({ ok: true, ...result });
  } catch (err) {
    sendCategoryError(res, err, 'Could not delete category');
  }
});

const subcategoryCreateSchema = z.object({
  label: z.string().min(2).max(80),
});

const subcategoryRenameSchema = z.object({
  label: z.string().min(2).max(80),
});

router.post('/:slug/subcategories', async (req, res) => {
  let body: z.infer<typeof subcategoryCreateSchema>;
  try {
    body = subcategoryCreateSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Subcategory name must be 2–80 characters' });
    return;
  }
  try {
    const category = await addSubcategory(String(req.params.slug), body.label);
    await invalidateCatalogCache();
    res.status(201).json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not add subcategory');
  }
});

router.patch('/:slug/subcategories/:name', async (req, res) => {
  let body: z.infer<typeof subcategoryRenameSchema>;
  try {
    body = subcategoryRenameSchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Subcategory name must be 2–80 characters' });
    return;
  }
  try {
    const category = await renameSubcategory(
      String(req.params.slug),
      decodeURIComponent(String(req.params.name)),
      body.label,
    );
    await invalidateCatalogCache();
    res.json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not rename subcategory');
  }
});

router.delete('/:slug/subcategories/:name', async (req, res) => {
  try {
    const category = await deleteSubcategory(
      String(req.params.slug),
      decodeURIComponent(String(req.params.name)),
    );
    await invalidateCatalogCache();
    res.json({ category });
  } catch (err) {
    sendCategoryError(res, err, 'Could not delete subcategory');
  }
});

export default router;
