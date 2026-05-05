/** Shared JSON shape for product responses (matches extended catalog schema). */

export type ProductDimensions = {
  displayNote?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

type DimensionsLike = {
  displayNote?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
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

/** Mongoose lean docs may surface `null` on optional paths — normalize for JSON. */
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
  tags?: string[] | null;
  materials?: string[] | null;
  dimensions?: DimensionsLike;
  weightGrams?: number | null;
  careInstructions?: string | null;
};

export function productToJson(p: ProductLike) {
  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    compareAtPrice: p.compareAtPrice == null ? undefined : p.compareAtPrice,
    images: p.images ?? [],
    stock: p.stock,
    isActive: p.isActive ?? true,
    category: p.category ?? 'General',
    subcategory: p.subcategory == null ? undefined : p.subcategory,
    sku: p.sku == null ? undefined : p.sku,
    slug: p.slug == null ? undefined : p.slug,
    tags: p.tags ?? [],
    materials: p.materials ?? [],
    dimensions: normalizeDimensions(p.dimensions ?? null),
    weightGrams: p.weightGrams == null ? undefined : p.weightGrams,
    careInstructions: p.careInstructions == null ? undefined : p.careInstructions,
  };
}
