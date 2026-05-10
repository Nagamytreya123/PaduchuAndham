/** Customer-facing collection filters; `apiCategory` is sent as `?category=` (empty = all). */
export type CollectionFilterKey = 'all' | 'Jewellery' | 'Watches' | 'Bracelets';

/** Home page only: curated jewellery sets (not a product category). */
export type StorefrontCollectionFilterKey = CollectionFilterKey | 'Combos';

export const COLLECTION_CATEGORY_FILTERS: {
  key: CollectionFilterKey;
  label: string;
  apiCategory: string;
}[] = [
  { key: 'all', label: 'All', apiCategory: '' },
  { key: 'Jewellery', label: 'Jewellery', apiCategory: 'Jewellery' },
  { key: 'Watches', label: 'Watches', apiCategory: 'Watches' },
  { key: 'Bracelets', label: 'Bracelets', apiCategory: 'Bracelets' },
];

/** Storefront collection bar (includes Combos). Admin catalog uses `COLLECTION_CATEGORY_FILTERS` only. */
export const STOREFRONT_COLLECTION_FILTERS: {
  key: StorefrontCollectionFilterKey;
  label: string;
  /** Sent as `?category=` for the products API; empty for All and Combos. */
  apiCategory: string;
}[] = [
  ...COLLECTION_CATEGORY_FILTERS,
  { key: 'Combos', label: 'Combos', apiCategory: '' },
];

export function searchParamToFilterKey(categoryParam: string): StorefrontCollectionFilterKey {
  const p = categoryParam.trim().toLowerCase();
  if (!p) return 'all';
  if (p === 'jewellery') return 'Jewellery';
  if (p === 'watches') return 'Watches';
  if (p === 'bracelets') return 'Bracelets';
  if (p === 'combos') return 'Combos';
  return 'all';
}

export function filterKeyToApiCategory(key: StorefrontCollectionFilterKey): string {
  if (key === 'Combos') return '';
  return COLLECTION_CATEGORY_FILTERS.find((f) => f.key === key)?.apiCategory ?? '';
}
