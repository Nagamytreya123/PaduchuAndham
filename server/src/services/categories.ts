import { randomUUID } from 'node:crypto';
import { CategoryModel, type CategoryKind, type CategorySizeMode } from '../models/Category.js';
import { ProductModel } from '../models/Product.js';
import { ReviewModel } from '../models/Review.js';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { CartModel } from '../models/Cart.js';

const WATCH_TILE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=640&q=80&auto=format';
const BRACELET_TILE =
  'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=640&q=80&auto=format';

/** Default categories ensured on boot. Admins can add more via POST /api/admin/categories. */
const CANONICAL_CATEGORIES: {
  slug: string;
  label: string;
  sortOrder: number;
  kind: CategoryKind;
  tileImageUrl: string;
}[] = [
  { slug: 'watches', label: 'Watches', sortOrder: 10, kind: 'watch', tileImageUrl: WATCH_TILE },
  { slug: 'bracelets', label: 'Bracelets', sortOrder: 20, kind: 'bracelet', tileImageUrl: BRACELET_TILE },
];

export type PublicPriceFilter = {
  id: string;
  label: string;
  minPaise: number | null;
  maxPaise: number | null;
  subcategory: string | null;
};

export type PublicCategory = {
  slug: string;
  label: string;
  sortOrder: number;
  kind: CategoryKind;
  tileImageUrl: string;
  productCount: number;
  subcategories: string[];
  priceFilters: PublicPriceFilter[];
  priceFiltersEnabled: boolean;
  isCombo: boolean;
  sizeMode: CategorySizeMode;
  isActive: boolean;
};

export async function ensureCanonicalCategories(): Promise<void> {
  const existing = await CategoryModel.countDocuments();
  if (existing > 0) return;
  for (const row of CANONICAL_CATEGORIES) {
    await CategoryModel.updateOne(
      { slug: row.slug },
      {
        $setOnInsert: {
          slug: row.slug,
          label: row.label,
          sortOrder: row.sortOrder,
          kind: row.kind,
          tileImageUrl: row.tileImageUrl,
          isActive: true,
          priceFilters: [],
          priceFiltersEnabled: true,
        },
      },
      { upsert: true },
    );
  }
}

export async function findActiveCategoryByInput(raw: string): Promise<{
  slug: string;
  label: string;
  kind: CategoryKind;
} | null> {
  return findCategoryByInput(raw, true);
}

export async function findCategoryByInput(
  raw: string,
  activeOnly = false,
): Promise<{
  slug: string;
  label: string;
  kind: CategoryKind;
} | null> {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const doc = await CategoryModel.findOne({
    ...(activeOnly ? { isActive: true } : {}),
    $or: [{ slug: key }, { label: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  })
    .select('slug label kind')
    .lean();
  if (!doc) return null;
  return { slug: doc.slug, label: doc.label, kind: doc.kind as CategoryKind };
}

/** Persist slug on products so filters stay stable if labels change. */
export async function normalizeCategoryInput(raw: string): Promise<string | null> {
  const found = await findCategoryByInput(raw, false);
  return found?.slug ?? null;
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  return listCategories(true);
}

export async function listAdminCategories(): Promise<PublicCategory[]> {
  return listCategories(false);
}

async function listCategories(activeOnly: boolean): Promise<PublicCategory[]> {
  const docs = await CategoryModel.find(activeOnly ? { isActive: true } : {})
    .sort({ sortOrder: 1, label: 1 })
    .lean();

  let countByKey = new Map<string, number>();
  let subsByCat = new Map<string, string[]>();

  const products = await ProductModel.find({ isActive: true }).lean();
  for (const p of products) {
    const cat = String(p.category ?? '').trim().toLowerCase();
    if (!cat) continue;
    countByKey.set(cat, (countByKey.get(cat) ?? 0) + 1);
    const sub = String(p.subcategory ?? '').trim();
    if (!sub) continue;
    const list = subsByCat.get(cat) ?? [];
    if (!list.some((s) => s.toLowerCase() === sub.toLowerCase())) list.push(sub);
    subsByCat.set(cat, list);
  }

  const mapped = docs.map((d) => {
    const slug = d.slug;
    const label = d.label;
    const productCount =
      (countByKey.get(slug.toLowerCase()) ?? 0) +
      (label.toLowerCase() !== slug.toLowerCase() ? (countByKey.get(label.toLowerCase()) ?? 0) : 0);
    const subcategories = mergeSubcategoryLists(
      Array.isArray(d.subcategories) ? d.subcategories.map(String) : [],
      subsByCat.get(slug.toLowerCase()) ?? [],
      label.toLowerCase() !== slug.toLowerCase() ? (subsByCat.get(label.toLowerCase()) ?? []) : [],
    );
    return {
      slug,
      label,
      sortOrder: d.sortOrder,
      kind: d.kind as CategoryKind,
      tileImageUrl: d.tileImageUrl ?? '',
      productCount,
      subcategories,
      priceFilters: mapPriceFilters(d.priceFilters),
      priceFiltersEnabled: d.priceFiltersEnabled !== false,
      isCombo: d.isCombo === true,
      sizeMode: d.sizeMode === 'option' ? 'option' : 'description',
      isActive: d.isActive !== false,
    };
  });

  const bySlug = new Map<string, PublicCategory>();
  for (const cat of mapped) {
    const key = cat.slug.toLowerCase();
    const existing = bySlug.get(key);
    if (!existing || cat.productCount > existing.productCount) {
      bySlug.set(key, cat);
    }
  }
  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

function mapPriceFilters(raw: unknown): PublicPriceFilter[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as {
        id?: unknown;
        label?: unknown;
        minPaise?: unknown;
        maxPaise?: unknown;
        subcategory?: unknown;
      };
      const id = typeof r.id === 'string' ? r.id.trim() : '';
      const label = typeof r.label === 'string' ? r.label.trim() : '';
      if (!id || !label) return null;
      const minPaise =
        typeof r.minPaise === 'number' && Number.isFinite(r.minPaise) ? Math.max(0, Math.round(r.minPaise)) : null;
      const maxPaise =
        typeof r.maxPaise === 'number' && Number.isFinite(r.maxPaise) ? Math.max(0, Math.round(r.maxPaise)) : null;
      const sub = typeof r.subcategory === 'string' ? r.subcategory.trim() : '';
      return {
        id,
        label,
        minPaise,
        maxPaise,
        subcategory: sub || null,
      };
    })
    .filter((x): x is PublicPriceFilter => x != null);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSubcategoryLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function findStoredSubcategoryIndex(list: string[], name: string): number {
  const key = name.trim().toLowerCase();
  return list.findIndex((s) => s.trim().toLowerCase() === key);
}

async function loadCategoryDoc(slugRaw: string) {
  const slug = slugRaw.trim().toLowerCase();
  const doc = await CategoryModel.findOne({ slug });
  if (!doc) {
    throw new CategoryServiceError('Category not found', 404);
  }
  return doc;
}

async function reloadCategory(slug: string): Promise<PublicCategory> {
  const list = await listAdminCategories();
  const updated = list.find((c) => c.slug === slug);
  if (!updated) {
    throw new CategoryServiceError('Category was saved but could not be loaded', 500);
  }
  return updated;
}

function mergeSubcategoryLists(...lists: string[][]): string[] {
  const merged: string[] = [];
  for (const list of lists) {
    for (const raw of list) {
      const sub = raw.trim();
      if (!sub) continue;
      if (!merged.some((s) => s.toLowerCase() === sub.toLowerCase())) merged.push(sub);
    }
  }
  return merged.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function categoryNamesForFilter(slug: string, label: string): string[] {
  return [...new Set([slug, label].map((s) => s.trim()).filter(Boolean))];
}

export function productCategoryFilter(names: string[]): Record<string, unknown> {
  return {
    $or: names.map((name) => ({
      category: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })),
  };
}

/** Price filters applicable to a category + optional subcategory (mirrors storefront). */
export function priceFiltersForCategorySelection(
  priceFilters: PublicPriceFilter[],
  priceFiltersEnabled: boolean,
  subcategoryRaw: string,
): PublicPriceFilter[] {
  if (!priceFiltersEnabled) return [];
  if (priceFilters.length === 0) return [];
  const subcategory = subcategoryRaw.trim();
  if (subcategory) {
    const forSub = priceFilters.filter(
      (f) => (f.subcategory ?? '').trim().toLowerCase() === subcategory.toLowerCase(),
    );
    if (forSub.length > 0) return forSub;
  }
  return priceFilters.filter((f) => !f.subcategory);
}

export function resolvePriceFilterById(
  available: PublicPriceFilter[],
  idRaw: string,
): PublicPriceFilter | null {
  const key = idRaw.trim().toLowerCase();
  if (!key || available.length === 0) return null;
  return available.find((f) => f.id.toLowerCase() === key) ?? null;
}

export function buildPriceRangeMongoFilter(
  minPaise: number | null,
  maxPaise: number | null,
): Record<string, unknown> | null {
  if (minPaise == null && maxPaise == null) return null;
  const price: Record<string, number> = {};
  if (minPaise != null) price.$gte = minPaise;
  if (maxPaise != null) price.$lte = maxPaise;
  return { price };
}

/** Resolve an active storefront price filter for a category query. */
export async function resolveStorefrontPriceFilter(
  categoryRaw: string,
  subcategoryRaw: string,
  priceFilterIdRaw: string,
): Promise<PublicPriceFilter | null> {
  const id = priceFilterIdRaw.trim();
  if (!id || !categoryRaw.trim()) return null;
  const cat = await findCategoryByInput(categoryRaw, true);
  if (!cat) return null;
  const doc = await CategoryModel.findOne({ slug: cat.slug })
    .select('priceFilters priceFiltersEnabled')
    .lean();
  if (!doc || doc.priceFiltersEnabled === false) return null;
  const filters = mapPriceFilters(doc.priceFilters);
  const available = priceFiltersForCategorySelection(filters, true, subcategoryRaw);
  return resolvePriceFilterById(available, id);
}

/** Public product list filter — case-insensitive category and subcategory match. */
export function buildProductListFilter(
  categoryRaw: string,
  subcategoryRaw: string,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { isActive: true };
  const category = categoryRaw.trim();
  const subcategory = subcategoryRaw.trim();

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  }

  if (subcategory) {
    filter.subcategory = new RegExp(`^${escapeRegex(subcategory)}$`, 'i');
  }

  return filter;
}

/** Exclude products whose category is switched off for the storefront. */
export async function storefrontHiddenCategoryFilter(): Promise<Record<string, unknown> | null> {
  const hidden = await CategoryModel.find({ isActive: false }).select('slug label').lean();
  if (hidden.length === 0) return null;
  const names = [
    ...new Set(hidden.flatMap((d) => [String(d.slug), String(d.label)].map((s) => s.trim()).filter(Boolean))),
  ] as string[];
  return {
    $nor: names.map((name: string) => ({ category: new RegExp(`^${escapeRegex(name)}$`, 'i') })),
  };
}

export async function isStorefrontHiddenCategory(productCategory: string): Promise<boolean> {
  const key = productCategory.trim().toLowerCase();
  if (!key) return false;
  const doc = await CategoryModel.findOne({
    isActive: false,
    $or: [{ slug: key }, { label: new RegExp(`^${escapeRegex(key)}$`, 'i') }],
  })
    .select('_id')
    .lean();
  return Boolean(doc);
}

export function slugifyCategoryLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function inferCategoryKind(slug: string, label: string): CategoryKind {
  const hay = `${slug} ${label}`.toLowerCase();
  if (/\bwatches?\b/.test(hay)) return 'watch';
  if (/\bbracelets?\b/.test(hay)) return 'bracelet';
  if (/\bjewell?ery\b/.test(hay)) return 'jewellery';
  return 'generic';
}

export class CategoryServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Create or reactivate a storefront category from an admin-entered name. */
export async function createCategoryFromLabel(labelRaw: string): Promise<PublicCategory> {
  const label = labelRaw.trim().replace(/\s+/g, ' ');
  if (label.length < 2 || label.length > 80) {
    throw new CategoryServiceError('Category name must be 2–80 characters', 400);
  }
  const slug = slugifyCategoryLabel(label);
  if (!slug) {
    throw new CategoryServiceError('Use letters or numbers in the category name', 400);
  }

  const existing = await CategoryModel.findOne({
    $or: [{ slug }, { label: new RegExp(`^${escapeRegex(label)}$`, 'i') }],
  });

  if (existing) {
    existing.isActive = true;
    if (!existing.label.trim()) existing.label = label;
    await existing.save();
  } else {
    const top = await CategoryModel.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    await CategoryModel.create({
      slug,
      label,
      sortOrder: (top?.sortOrder ?? 0) + 10,
      kind: inferCategoryKind(slug, label),
      isActive: true,
    });
  }

  const list = await listPublicCategories();
  const created = list.find((c) => c.slug === slug || c.label.toLowerCase() === label.toLowerCase());
  if (!created) {
    throw new CategoryServiceError('Category was saved but could not be loaded', 500);
  }
  return created;
}

export type PriceFilterInput = {
  id?: string;
  label: string;
  minPaise?: number | null;
  maxPaise?: number | null;
  subcategory?: string | null;
};

function normalizePriceFilterInputs(raw: PriceFilterInput[]): PublicPriceFilter[] {
  if (raw.length > 30) {
    throw new CategoryServiceError('You can add at most 30 price filters per category', 400);
  }
  const seen = new Set<string>();
  return raw.map((row, i) => {
    const label = (row.label ?? '').trim().replace(/\s+/g, ' ');
    if (label.length < 1 || label.length > 80) {
      throw new CategoryServiceError(`Price filter ${i + 1}: name must be 1–80 characters`, 400);
    }
    const minPaise =
      row.minPaise == null || row.minPaise === undefined ? null : Math.round(Number(row.minPaise));
    const maxPaise =
      row.maxPaise == null || row.maxPaise === undefined ? null : Math.round(Number(row.maxPaise));
    if (minPaise != null && (!Number.isFinite(minPaise) || minPaise < 0)) {
      throw new CategoryServiceError(`Price filter ${i + 1}: invalid minimum`, 400);
    }
    if (maxPaise != null && (!Number.isFinite(maxPaise) || maxPaise < 0)) {
      throw new CategoryServiceError(`Price filter ${i + 1}: invalid maximum`, 400);
    }
    if (minPaise == null && maxPaise == null) {
      throw new CategoryServiceError(`Price filter ${i + 1}: set a minimum, maximum, or both`, 400);
    }
    if (minPaise != null && maxPaise != null && minPaise > maxPaise) {
      throw new CategoryServiceError(`Price filter ${i + 1}: minimum cannot exceed maximum`, 400);
    }
    const subcategory = (row.subcategory ?? '').trim() || null;
    if (subcategory && subcategory.length > 80) {
      throw new CategoryServiceError(`Price filter ${i + 1}: subcategory is too long`, 400);
    }
    let id = (row.id ?? '').trim() || randomUUID();
    if (id.length > 80) id = randomUUID();
    if (seen.has(id)) id = randomUUID();
    seen.add(id);
    return { id, label, minPaise, maxPaise, subcategory };
  });
}

export async function updateCategory(
  slugRaw: string,
  patch: {
    label?: string;
    tileImageUrl?: string | null;
    priceFilters?: PriceFilterInput[];
    priceFiltersEnabled?: boolean;
    isCombo?: boolean;
    sizeMode?: CategorySizeMode;
    isActive?: boolean;
  },
): Promise<PublicCategory> {
  const slug = slugRaw.trim().toLowerCase();
  const doc = await CategoryModel.findOne({ slug });
  if (!doc) {
    throw new CategoryServiceError('Category not found', 404);
  }

  if (patch.label !== undefined) {
    const label = patch.label.trim().replace(/\s+/g, ' ');
    if (label.length < 2 || label.length > 80) {
      throw new CategoryServiceError('Category name must be 2–80 characters', 400);
    }
    const clash = await CategoryModel.findOne({
      slug: { $ne: slug },
      label: new RegExp(`^${escapeRegex(label)}$`, 'i'),
    });
    if (clash) {
      throw new CategoryServiceError('Another category already uses that name', 409);
    }
    doc.label = label;
  }

  if (patch.tileImageUrl !== undefined) {
    doc.tileImageUrl = patch.tileImageUrl?.trim() ?? '';
  }

  if (patch.priceFilters !== undefined) {
    doc.set('priceFilters', normalizePriceFilterInputs(patch.priceFilters));
  }

  if (patch.priceFiltersEnabled !== undefined) {
    doc.priceFiltersEnabled = patch.priceFiltersEnabled;
  }

  if (patch.isCombo !== undefined) {
    doc.isCombo = patch.isCombo;
  }

  if (patch.sizeMode !== undefined) {
    doc.sizeMode = patch.sizeMode === 'option' ? 'option' : 'description';
  }

  if (patch.isActive !== undefined) {
    doc.isActive = patch.isActive;
  }

  await doc.save();
  const list = await listAdminCategories();
  const updated = list.find((c) => c.slug === slug);
  if (!updated) {
    throw new CategoryServiceError('Category was saved but could not be loaded', 500);
  }
  return updated;
}

export async function setCategoryTileImage(slugRaw: string, imageUrl: string): Promise<PublicCategory> {
  const url = imageUrl.trim();
  if (!url) {
    throw new CategoryServiceError('Upload an image file', 400);
  }
  return updateCategory(slugRaw, { tileImageUrl: url });
}

/** Permanently delete a category, every product in it, and related shop state. */
export async function deleteCategory(slugRaw: string): Promise<{
  deletedProductIds: string[];
  deletedProducts: number;
  deletedCombos: number;
}> {
  const slug = slugRaw.trim().toLowerCase();
  const doc = await CategoryModel.findOne({ slug });
  if (!doc) {
    throw new CategoryServiceError('Category not found', 404);
  }

  const names = [...new Set([doc.slug, doc.label].map((s) => s.trim()).filter(Boolean))];
  const categoryFilter = {
    $or: names.map((name) => ({
      category: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })),
  };

  const products = await ProductModel.find(categoryFilter).select('_id').lean();
  const productIds = products.map((p) => String(p._id));
  const deletedProductIds = productIds;

  let deletedCombos = 0;
  if (productIds.length > 0) {
    const comboDel = await JewelleryComboModel.deleteMany({ productIds: { $in: productIds } });
    deletedCombos = comboDel.deletedCount ?? 0;

    await ReviewModel.deleteMany({ product: { $in: productIds } });
    await ProductModel.updateMany(
      { matchingBraceletIds: { $in: productIds } },
      { $pull: { matchingBraceletIds: { $in: productIds } } },
    );

    const carts = await CartModel.find({ 'items.productId': { $in: productIds } });
    const idSet = new Set(deletedProductIds);
    for (const cart of carts) {
      const brokenGroups = new Set(
        cart.items
          .filter((item) => idSet.has(String(item.productId)))
          .map((item) => item.bundleGroupId)
          .filter((g): g is string => Boolean(g)),
      );
      cart.set(
        'items',
        cart.items.filter((item) => {
          if (idSet.has(String(item.productId))) return false;
          if (item.bundleGroupId && brokenGroups.has(item.bundleGroupId)) return false;
          return true;
        }),
      );
      await cart.save();
    }

    await ProductModel.deleteMany({ _id: { $in: productIds } });
  }

  await CategoryModel.deleteOne({ _id: doc._id });

  return {
    deletedProductIds,
    deletedProducts: productIds.length,
    deletedCombos,
  };
}

/** Add an admin-defined subcategory to a category. */
export async function addSubcategory(slugRaw: string, labelRaw: string): Promise<PublicCategory> {
  const label = normalizeSubcategoryLabel(labelRaw);
  if (label.length < 2 || label.length > 80) {
    throw new CategoryServiceError('Subcategory name must be 2–80 characters', 400);
  }
  const doc = await loadCategoryDoc(slugRaw);
  const stored = [...(doc.subcategories ?? []).map(String)];
  if (findStoredSubcategoryIndex(stored, label) >= 0) {
    throw new CategoryServiceError('That subcategory already exists', 409);
  }
  stored.push(label);
  doc.set('subcategories', stored);
  await doc.save();
  return reloadCategory(doc.slug);
}

/** Rename a subcategory and update products and price filters in that category. */
export async function renameSubcategory(
  slugRaw: string,
  oldNameRaw: string,
  newNameRaw: string,
): Promise<PublicCategory> {
  const oldName = normalizeSubcategoryLabel(oldNameRaw);
  const newName = normalizeSubcategoryLabel(newNameRaw);
  if (!oldName) {
    throw new CategoryServiceError('Subcategory name is required', 400);
  }
  if (newName.length < 2 || newName.length > 80) {
    throw new CategoryServiceError('Subcategory name must be 2–80 characters', 400);
  }
  if (oldName.toLowerCase() === newName.toLowerCase()) {
    return reloadCategory(slugRaw);
  }

  const doc = await loadCategoryDoc(slugRaw);
  const stored = [...(doc.subcategories ?? []).map(String)];
  const idx = findStoredSubcategoryIndex(stored, oldName);
  if (idx >= 0) {
    if (findStoredSubcategoryIndex(stored, newName) >= 0) {
      throw new CategoryServiceError('Another subcategory already uses that name', 409);
    }
    stored[idx] = newName;
  } else if (findStoredSubcategoryIndex(stored, newName) < 0) {
    stored.push(newName);
  } else {
    throw new CategoryServiceError('Another subcategory already uses that name', 409);
  }
  doc.set('subcategories', stored);

  const names = categoryNamesForFilter(doc.slug, doc.label);
  const oldRegex = new RegExp(`^${escapeRegex(oldName)}$`, 'i');

  const productCount = await ProductModel.countDocuments({
    ...productCategoryFilter(names),
    subcategory: oldRegex,
  });
  if (productCount === 0 && idx < 0) {
    throw new CategoryServiceError('Subcategory not found', 404);
  }

  await ProductModel.updateMany(
    { ...productCategoryFilter(names), subcategory: oldRegex },
    { $set: { subcategory: newName } },
  );

  const filters = mapPriceFilters(doc.priceFilters);
  if (filters.some((f) => f.subcategory && oldRegex.test(f.subcategory))) {
    doc.set(
      'priceFilters',
      filters.map((f) =>
        f.subcategory && oldRegex.test(f.subcategory) ? { ...f, subcategory: newName } : f,
      ),
    );
  }

  await doc.save();
  return reloadCategory(doc.slug);
}

/** Remove a subcategory and clear it from products and price filters in that category. */
export async function deleteSubcategory(slugRaw: string, nameRaw: string): Promise<PublicCategory> {
  const name = normalizeSubcategoryLabel(nameRaw);
  if (!name) {
    throw new CategoryServiceError('Subcategory name is required', 400);
  }

  const doc = await loadCategoryDoc(slugRaw);
  const stored = [...(doc.subcategories ?? []).map(String)];
  const idx = findStoredSubcategoryIndex(stored, name);
  if (idx >= 0) {
    stored.splice(idx, 1);
    doc.set('subcategories', stored);
  }

  const names = categoryNamesForFilter(doc.slug, doc.label);
  const nameRegex = new RegExp(`^${escapeRegex(name)}$`, 'i');

  const productCount = await ProductModel.countDocuments({
    ...productCategoryFilter(names),
    subcategory: nameRegex,
  });
  if (idx < 0 && productCount === 0) {
    throw new CategoryServiceError('Subcategory not found', 404);
  }

  await ProductModel.updateMany(
    { ...productCategoryFilter(names), subcategory: nameRegex },
    { $set: { subcategory: '' } },
  );

  const filters = mapPriceFilters(doc.priceFilters);
  if (filters.some((f) => f.subcategory && nameRegex.test(f.subcategory))) {
    doc.set(
      'priceFilters',
      filters.map((f) =>
        f.subcategory && nameRegex.test(f.subcategory) ? { ...f, subcategory: null } : f,
      ),
    );
  }

  await doc.save();
  return reloadCategory(doc.slug);
}
