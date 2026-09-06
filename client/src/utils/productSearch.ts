import type { ProductSummary } from '../types/product';
import type { CatalogCategory } from './catalogCategory';

const INTENT_SYNONYMS: Record<string, string[]> = {
  watch: ['watches', 'timepiece', 'chronograph', 'dial', 'strap'],
  bracelet: ['bracelets', 'bangle', 'bangles', 'wristband', 'wrist'],
  ring: ['rings', 'band'],
  jewellery: ['jewelry', 'jewel', 'ornament', 'accessory'],
  gold: ['golden', 'gilded'],
  silver: ['sterling'],
  pearl: ['pearls'],
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized
    .split(/[\s,+/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 || /^\d+$/.test(t));
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const token of tokens) {
    for (const [key, synonyms] of Object.entries(INTENT_SYNONYMS)) {
      if (token === key || synonyms.includes(token)) {
        out.add(key);
        for (const synonym of synonyms) out.add(synonym);
      }
    }
  }
  return [...out];
}

function categoryLabelFor(category: string, categories: CatalogCategory[]): string | undefined {
  const key = category.trim().toLowerCase();
  return categories.find(
    (c) => c.slug.toLowerCase() === key || c.label.toLowerCase() === key,
  )?.label;
}

export function scoreProductSearch(
  product: ProductSummary,
  rawQuery: string,
  categories: CatalogCategory[],
): number {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;

  const tokens = expandTokens(tokenizeQuery(rawQuery));
  if (tokens.length === 0 && query.length >= 2) tokens.push(query);

  const label = categoryLabelFor(product.category, categories);
  let score = 0;
  const name = normalizeSearchText(product.name);
  const sku = normalizeSearchText(product.sku ?? '');
  const slug = normalizeSearchText(product.slug ?? '');
  const category = normalizeSearchText(product.category);
  const categoryName = normalizeSearchText(label ?? '');
  const haystack = normalizeSearchText(
    [
      product.name,
      product.description,
      product.category,
      label,
      product.subcategory,
      product.sku,
      product.slug,
      ...(product.tags ?? []),
      ...(product.materials ?? []),
      product.watchDetails?.dial,
      product.watchDetails?.color,
      product.watchDetails?.strapType,
      product.watchDetails?.caseShape,
      product.jewelryDetails?.materialType,
      product.jewelryDetails?.finishOrPlating,
      product.jewelryDetails?.stoneOrMotif,
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (name.includes(query)) score += 120;
  if (name.startsWith(query)) score += 40;
  if (sku === query) score += 200;
  else if (sku.includes(query)) score += 80;
  if (slug.includes(query)) score += 60;
  if (haystack.includes(query)) score += 15;

  for (const token of tokens) {
    if (name === token) score += 100;
    else if (name.startsWith(token)) score += 55;
    else if (name.includes(token)) score += 35;

    if (sku === token) score += 90;
    else if (sku.includes(token)) score += 45;

    if (category === token || categoryName === token) score += 50;
    else if (category.includes(token) || categoryName.includes(token)) score += 30;

    if (normalizeSearchText(product.subcategory ?? '').includes(token)) score += 25;
    if ((product.tags ?? []).some((tag) => normalizeSearchText(tag).includes(token))) score += 20;
    if ((product.materials ?? []).some((material) => normalizeSearchText(material).includes(token))) score += 18;
    if (haystack.includes(token)) score += 12;
  }

  return score;
}

export function rankProductsBySearch(
  products: ProductSummary[],
  rawQuery: string,
  categories: CatalogCategory[],
): ProductSummary[] {
  const query = rawQuery.trim();
  if (!query) return products;

  return products
    .map((product) => ({
      product,
      score: scoreProductSearch(product, query, categories),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .map((row) => row.product);
}

export function topSearchSuggestions(
  products: ProductSummary[],
  rawQuery: string,
  categories: CatalogCategory[],
  limit = 6,
): ProductSummary[] {
  return rankProductsBySearch(products, rawQuery, categories).slice(0, limit);
}
