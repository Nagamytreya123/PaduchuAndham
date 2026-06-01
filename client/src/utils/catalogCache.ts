import type { ProductSummary } from '../types/product';

const byId = new Map<string, ProductSummary>();

/** Seed from shop/home list responses so PDP can resolve ids without a flash. */
export function seedCatalog(products: ProductSummary[]) {
  for (const p of products) {
    if (p.isActive !== false) {
      byId.set(p.id, p);
    }
  }
}

export function getCachedProduct(id: string): ProductSummary | undefined {
  return byId.get(id);
}

export function cacheProduct(product: ProductSummary) {
  byId.set(product.id, product);
}
