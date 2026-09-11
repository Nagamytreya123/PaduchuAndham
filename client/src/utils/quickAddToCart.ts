import { apiFetch } from '../api/client';
import type { AddBundleInput } from '../context/CartContext';
import type { CartLine } from '../context/CartContext';
import type { ProductSummary } from '../types/product';
import { allocateListRatioBundle } from './bundlePricing';
import { getProductDisplayImage } from './productImage';
import { categoryUsesSizeOptions } from './catalogCategory';
import type { CatalogCategory } from './catalogCategory';

export function isComboListing(product: ProductSummary, comboCategoryKeys?: Set<string>): boolean {
  if ((product.comboProductIds?.length ?? 0) >= 2) return true;
  if (!comboCategoryKeys?.size) return false;
  const cat = product.category.trim().toLowerCase();
  return Boolean(cat && comboCategoryKeys.has(cat));
}

export async function quickAddProductSummary(
  product: ProductSummary,
  add: (line: Omit<CartLine, 'qty'> & { qty?: number }) => void,
  addBundle: (input: AddBundleInput) => void,
  comboCategoryKeys?: Set<string>,
  categories: CatalogCategory[] = [],
): Promise<'added' | 'needs_size' | 'unavailable'> {
  if (product.stock < 1 || product.isActive === false) return 'unavailable';

  if (categoryUsesSizeOptions(product.category, categories) && (product.sizeOptions?.length ?? 0) > 0) {
    return 'needs_size';
  }

  const image = getProductDisplayImage(product);

  if (isComboListing(product, comboCategoryKeys)) {
    const data = await apiFetch<{ product: ProductSummary }>(`/api/products/${product.id}`);
    const comboProducts = data.product.comboProducts ?? [];
    if (comboProducts.length < 2) return 'unavailable';

    const comboMaxQty = Math.min(
      product.stock,
      ...comboProducts.map((p) => p.stock || 0),
    );
    if (comboMaxQty < 1) return 'unavailable';

    const alloc = allocateListRatioBundle(
      comboProducts.map((p) => p.price),
      product.price,
    );

    addBundle({
      groupId: `product-combo-${product.id}`,
      displayName: product.name,
      unitTotalPaise: product.price,
      image,
      components: comboProducts.map((p, i) => ({
        productId: p.id,
        name: p.name,
        unitPricePaise: alloc[i]!,
        image: p.images[0],
      })),
      qty: 1,
    });
    return 'added';
  }

  add({
    productId: product.id,
    name: product.name,
    price: product.price,
    qty: 1,
    image,
  });
  return 'added';
}
