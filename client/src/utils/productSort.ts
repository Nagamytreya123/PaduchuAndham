import type { ProductSummary } from '../types/product';

function timestampMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function productRecencyMs(product: ProductSummary): number {
  return timestampMs(product.updatedAt) || timestampMs(product.createdAt);
}

/** Newest created first for storefront grids. */
export function sortProductsByCreatedDesc(products: ProductSummary[]): ProductSummary[] {
  return [...products].sort((a, b) => {
    const diff = timestampMs(b.createdAt) - timestampMs(a.createdAt);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });
}

/** Most recently updated first; falls back to createdAt when updatedAt is missing. */
export function sortProductsByUpdatedDesc(products: ProductSummary[]): ProductSummary[] {
  return [...products].sort((a, b) => {
    const diff = productRecencyMs(b) - productRecencyMs(a);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });
}
