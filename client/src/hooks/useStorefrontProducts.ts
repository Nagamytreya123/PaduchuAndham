import { useEffect, useState } from 'react';

import { apiFetch } from '../api/client';
import type { ProductSummary } from '../types/product';

export function useStorefrontProducts() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        if (!cancelled) {
          setProducts(data.products.filter((product) => product.isActive !== false));
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}
