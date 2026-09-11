import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '../api/client';
import { pruneCatalog } from '../utils/catalogCache';
import {
  categoryKindOf,
  findCatalogCategory,
  normalizeCatalogCategory,
  type CatalogCategory,
  type CatalogCategoryKind,
} from '../utils/catalogCategory';

type RefreshOptions = {
  removedProductIds?: string[];
};

type CategoriesContextValue = {
  categories: CatalogCategory[];
  loading: boolean;
  catalogRevision: number;
  removedProductIds: string[];
  refresh: (opts?: RefreshOptions) => Promise<void>;
  labelFor: (productCategory: string) => string;
  kindFor: (productCategory: string) => CatalogCategoryKind | undefined;
  tileFor: (productCategory: string) => string;
  find: (productCategory: string) => CatalogCategory | undefined;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [removedProductIds, setRemovedProductIds] = useState<string[]>([]);
  const skipRevisionBump = useRef(true);

  const refresh = useCallback(async (opts?: RefreshOptions) => {
    const data = await apiFetch<{ categories: CatalogCategory[] }>('/api/categories', {
      cache: 'no-store',
    });
    setCategories((data.categories ?? []).map(normalizeCatalogCategory));
    const removed = opts?.removedProductIds ?? [];
    if (removed.length > 0) {
      pruneCatalog(removed);
      setRemovedProductIds(removed);
    } else {
      setRemovedProductIds([]);
    }
    if (skipRevisionBump.current) {
      skipRevisionBump.current = false;
      return;
    }
    setCatalogRevision((n) => n + 1);
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
      catalogRevision,
      removedProductIds,
      refresh,
      find: (productCategory) => findCatalogCategory(productCategory, categories),
      labelFor: (productCategory) =>
        findCatalogCategory(productCategory, categories)?.label ?? productCategory,
      kindFor: (productCategory) => categoryKindOf(productCategory, categories),
      tileFor: (productCategory) =>
        findCatalogCategory(productCategory, categories)?.tileImageUrl ?? '',
    };
  }, [categories, loading, catalogRevision, removedProductIds, refresh]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return ctx;
}
