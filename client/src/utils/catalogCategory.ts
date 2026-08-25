export type CatalogCategoryKind = 'watch' | 'bracelet' | 'jewellery' | 'generic';

export type CatalogPriceFilter = {
  id: string;
  label: string;
  minPaise: number | null;
  maxPaise: number | null;
  subcategory: string | null;
};

export type CatalogCategory = {
  slug: string;
  label: string;
  sortOrder: number;
  kind: CatalogCategoryKind;
  tileImageUrl: string;
  productCount: number;
  subcategories: string[];
  priceFilters: CatalogPriceFilter[];
  priceFiltersEnabled: boolean;
};

export function productMatchesCategory(productCategory: string, cat: CatalogCategory): boolean {
  const a = productCategory.trim().toLowerCase();
  if (!a) return false;
  return a === cat.slug.toLowerCase() || a === cat.label.toLowerCase();
}

export function findCatalogCategory(
  productCategory: string,
  categories: CatalogCategory[],
): CatalogCategory | undefined {
  return categories.find((c) => productMatchesCategory(productCategory, c));
}

export function categoryKindOf(
  productCategory: string,
  categories: CatalogCategory[],
): CatalogCategoryKind | undefined {
  return findCatalogCategory(productCategory, categories)?.kind;
}

export function shopPathForCategorySlug(slug: string): string {
  return `/shop?category=${encodeURIComponent(slug)}`;
}

export type CollectionFilterKey = string;

export function parseCollectionFilterParam(
  categoryParam: string,
  categories: CatalogCategory[],
  hasCombos: boolean,
): CollectionFilterKey {
  const p = categoryParam.trim().toLowerCase();
  if (!p) return 'all';
  if ((p === 'combos' || p === 'combo') && hasCombos) return 'combos';
  const match = categories.find(
    (c) => c.slug.toLowerCase() === p || c.label.toLowerCase() === p,
  );
  return match?.slug ?? 'all';
}

export function apiCategoryForFilter(key: CollectionFilterKey): string {
  if (key === 'all' || key === 'combos') return '';
  return key;
}

export function collectionFilterOptions(
  categories: CatalogCategory[],
  hasCombos: boolean,
): { key: CollectionFilterKey; label: string }[] {
  const opts: { key: CollectionFilterKey; label: string }[] = [{ key: 'all', label: 'All' }];
  for (const c of categories) {
    opts.push({ key: c.slug, label: c.label });
  }
  if (hasCombos) {
    opts.push({ key: 'combos', label: 'Combos' });
  }
  return opts;
}

export function subcategoriesForFilter(
  categories: CatalogCategory[],
  filterKey: CollectionFilterKey,
): string[] {
  if (filterKey === 'all' || filterKey === 'combos') return [];
  return categories.find((c) => c.slug === filterKey)?.subcategories ?? [];
}

/** Map a URL param onto a stored subcategory label, or empty if none / invalid. */
export function resolveSubcategoryParam(raw: string, available: string[]): string {
  const p = raw.trim().toLowerCase();
  if (!p || available.length === 0) return '';
  return available.find((s) => s.toLowerCase() === p) ?? '';
}

export function priceFiltersForSelection(
  categories: CatalogCategory[],
  filterKey: CollectionFilterKey,
  subcategory: string,
): CatalogPriceFilter[] {
  if (filterKey === 'all' || filterKey === 'combos') return [];
  const cat = categories.find((c) => c.slug === filterKey);
  if (!cat || cat.priceFiltersEnabled === false) return [];
  const filters = cat.priceFilters ?? [];
  if (filters.length === 0) return [];
  if (subcategory) {
    const forSub = filters.filter(
      (f) => (f.subcategory ?? '').trim().toLowerCase() === subcategory.trim().toLowerCase(),
    );
    if (forSub.length > 0) return forSub;
  }
  return filters.filter((f) => !f.subcategory);
}

export function resolvePriceFilterParam(raw: string, available: CatalogPriceFilter[]): CatalogPriceFilter | null {
  const p = raw.trim().toLowerCase();
  if (!p || available.length === 0) return null;
  return available.find((f) => f.id.toLowerCase() === p) ?? null;
}

export function productMatchesPriceFilter(
  pricePaise: number,
  filter: CatalogPriceFilter | null,
): boolean {
  if (!filter) return true;
  if (filter.minPaise != null && pricePaise < filter.minPaise) return false;
  if (filter.maxPaise != null && pricePaise > filter.maxPaise) return false;
  return true;
}
