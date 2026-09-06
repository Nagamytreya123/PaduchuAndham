import { normalizeImageList } from './mediaUrl.js';

/** Shared JSON shape for product responses (matches extended catalog schema). */

export type ProductDimensions = {
  displayNote?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type WatchDetailsJson = {
  caseShape?: string;
  dial?: string;
  strapType?: string;
  color?: string;
};

export type JewelryDetailsJson = {
  materialType?: string;
  finishOrPlating?: string;
  stoneOrMotif?: string;
  customizationNote?: string;
};

type DimensionsLike = {
  displayNote?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
} | null;

type WatchDetailsLike = {
  caseShape?: string | null;
  dial?: string | null;
  strapType?: string | null;
  color?: string | null;
} | null;

type JewelryDetailsLike = {
  materialType?: string | null;
  finishOrPlating?: string | null;
  stoneOrMotif?: string | null;
  customizationNote?: string | null;
} | null;

function normalizeDimensions(d: DimensionsLike | undefined): ProductDimensions | undefined {
  if (d == null) return undefined;
  return {
    displayNote: d.displayNote == null ? undefined : d.displayNote,
    lengthCm: d.lengthCm == null ? undefined : d.lengthCm,
    widthCm: d.widthCm == null ? undefined : d.widthCm,
    heightCm: d.heightCm == null ? undefined : d.heightCm,
  };
}

function normalizeWatchDetails(w: WatchDetailsLike | undefined): WatchDetailsJson | undefined {
  if (w == null) return undefined;
  const out: WatchDetailsJson = {};
  if (w.caseShape) out.caseShape = w.caseShape;
  if (w.dial) out.dial = w.dial;
  if (w.strapType) out.strapType = w.strapType;
  if (w.color) out.color = w.color;
  return Object.keys(out).length ? out : undefined;
}

function normalizeJewelryDetails(j: JewelryDetailsLike | undefined): JewelryDetailsJson | undefined {
  if (j == null) return undefined;
  const out: JewelryDetailsJson = {};
  if (j.materialType) out.materialType = j.materialType;
  if (j.finishOrPlating) out.finishOrPlating = j.finishOrPlating;
  if (j.stoneOrMotif) out.stoneOrMotif = j.stoneOrMotif;
  if (j.customizationNote) out.customizationNote = j.customizationNote;
  return Object.keys(out).length ? out : undefined;
}

/** Optional paths may surface `null` from storage — normalize for JSON. */
type ProductLike = {
  _id: unknown;
  name: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  images?: string[] | null;
  stock: number;
  isActive?: boolean | null;
  category?: string | null;
  subcategory?: string | null;
  sku?: string | null;
  slug?: string | null;
  materials?: string[] | null;
  tags?: string[] | null;
  dimensions?: DimensionsLike;
  weightGrams?: number | null;
  careInstructions?: string | null;
  watchDetails?: WatchDetailsLike;
  jewelryDetails?: JewelryDetailsLike;
  matchingBraceletIds?: unknown[] | null;
  watchBraceletBundlePrice?: number | null;
  comboProductIds?: unknown[] | null;
};

export function productToJson(p: ProductLike) {
  const braceletIds = p.matchingBraceletIds?.length
    ? p.matchingBraceletIds.map((id) => String(id))
    : undefined;
  const comboIds = p.comboProductIds?.length ? p.comboProductIds.map((id) => String(id)) : undefined;
  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    compareAtPrice: p.compareAtPrice == null ? undefined : p.compareAtPrice,
    images: normalizeImageList(p.images),
    stock: p.stock,
    isActive: p.isActive ?? true,
    category: p.category ?? '',
    subcategory: p.subcategory == null ? undefined : p.subcategory,
    sku: p.sku == null ? undefined : p.sku,
    slug: p.slug == null ? undefined : p.slug,
    materials: p.materials ?? [],
    tags: p.tags?.length ? [...p.tags] : [],
    dimensions: normalizeDimensions(p.dimensions ?? null),
    weightGrams: p.weightGrams == null ? undefined : p.weightGrams,
    careInstructions: p.careInstructions == null ? undefined : p.careInstructions,
    watchDetails: normalizeWatchDetails(p.watchDetails ?? null),
    jewelryDetails: normalizeJewelryDetails(p.jewelryDetails ?? null),
    matchingBraceletIds: braceletIds,
    watchBraceletBundlePrice:
      p.watchBraceletBundlePrice == null ? undefined : p.watchBraceletBundlePrice,
    comboProductIds: comboIds,
  };
}

/** Lighter payload for shop/home lists — omits embedded base64 images (can be multi-MB each). */
export function productToListJson(p: ProductLike) {
  const full = productToJson(p);
  const images = full.images.filter((url) => !url.startsWith('data:')).slice(0, 1);
  return {
    id: full.id,
    name: full.name,
    description: full.description,
    price: full.price,
    compareAtPrice: full.compareAtPrice,
    images,
    stock: full.stock,
    isActive: full.isActive,
    category: full.category,
    subcategory: full.subcategory,
    sku: full.sku,
    slug: full.slug,
    materials: full.materials,
    tags: full.tags,
    dimensions: full.dimensions,
    weightGrams: full.weightGrams,
    careInstructions: full.careInstructions,
    watchDetails: full.watchDetails,
    jewelryDetails: full.jewelryDetails,
    watchBraceletBundlePrice: full.watchBraceletBundlePrice,
  };
}
