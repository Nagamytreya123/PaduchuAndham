import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../api/client';
import {
  categoryKindOf,
  findCatalogCategory,
  type CatalogCategory,
  type CatalogCategoryKind,
} from '../utils/catalogCategory';

type CategoriesContextValue = {
  categories: CatalogCategory[];
  loading: boolean;
  refresh: () => Promise<void>;
  labelFor: (productCategory: string) => string;
  kindFor: (productCategory: string) => CatalogCategoryKind | undefined;
  tileFor: (productCategory: string) => string;
  find: (productCategory: string) => CatalogCategory | undefined;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await apiFetch<{ categories: CatalogCategory[] }>('/api/categories');
        setCategories(
          (data.categories ?? []).map((c) => ({
            ...c,
            priceFilters: c.priceFilters ?? [],
            priceFiltersEnabled: c.priceFiltersEnabled !== false,
            subcategories: c.subcategories ?? [],
            tileImageUrl: c.tileImageUrl ?? '',
          })),
        );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<CategoriesContextValue>(() => {
    return {
      categories,
      loading,
      refresh,
      find: (productCategory) => findCatalogCategory(productCategory, categories),
      labelFor: (productCategory) =>
        findCatalogCategory(productCategory, categories)?.label ?? productCategory,
      kindFor: (productCategory) => categoryKindOf(productCategory, categories),
      tileFor: (productCategory) =>
        findCatalogCategory(productCategory, categories)?.tileImageUrl ?? '',
    };
  }, [categories, loading, refresh]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return ctx;
}
