import {
  BRACELET_CATEGORY_TILE_IMAGE,
  COMBO_CATEGORY_TILE_IMAGE,
  JEWELLERY_CATEGORY_TILE_IMAGES,
  WATCH_CATEGORY_TILE_IMAGE,
} from '../constants/categoryTileImages';
import { getCategoryHeroContent } from '../constants/categoryHeroContent';
import type { StackSpreadCard, StackSpreadItem } from '../components/ui/stack-spread';
import type { ProductSummary } from '../types/product';
import { productMatchesCategory, type CatalogCategory } from './catalogCategory';
import { getProductDisplayImage, resolveMediaUrl } from './productImage';
import { sortProductsByUpdatedDesc } from './productSort';

export const STACK_SPREAD_CARD_COUNT = 8;

const SCALE: Partial<Record<number, number>> = {
  1: 0.9,
  2: 0.8,
  3: 0.9,
  4: 0.8,
  5: 0.8,
  6: 0.9,
  7: 0.9,
  8: 0.7,
};
const s = (i: number) => SCALE[i] ?? 1;

const CARD_LAYOUTS: Omit<StackSpreadCard, 'item'>[] = [
  {
    stackOffset: { x: -8, y: -10 },
    stackRotate: -18,
    target: { x: -20, y: -34, rotate: 0, scale: s(8), w: 17, h: 22 },
    targetSm: { x: -22, y: -40 },
    z: 2,
  },
  {
    stackOffset: { x: 14, y: -10 },
    stackRotate: 20,
    target: { x: 32, y: -30, rotate: 0, scale: s(7), w: 18, h: 32 },
    targetSm: { x: 22, y: -40 },
    z: 3,
  },
  {
    stackOffset: { x: -16, y: 0 },
    stackRotate: -4,
    target: { x: -36, y: -2, rotate: 0, scale: s(6), w: 15, h: 32 },
    targetSm: { x: -22, y: -19 },
    z: 4,
  },
  {
    stackOffset: { x: 1, y: -10 },
    stackRotate: -2,
    target: { x: 6, y: -32, rotate: 0, scale: s(5), w: 25, h: 30 },
    targetSm: { x: 22, y: -19 },
    z: 5,
  },
  {
    stackOffset: { x: 18, y: 1 },
    stackRotate: 6,
    target: { x: 37, y: 6, rotate: 0, scale: s(4), w: 18, h: 32 },
    targetSm: { x: -22, y: 20 },
    z: 6,
  },
  {
    stackOffset: { x: -6, y: 10 },
    stackRotate: 6,
    target: { x: -24, y: 34, rotate: 0, scale: s(3), w: 22, h: 25 },
    targetSm: { x: 22, y: 20 },
    z: 7,
  },
  {
    stackOffset: { x: 8, y: 7 },
    stackRotate: 3,
    target: { x: 2, y: 36, rotate: 0, scale: s(2), w: 20, h: 26 },
    targetSm: { x: -22, y: 40 },
    z: 8,
  },
  {
    stackOffset: { x: 20, y: 12 },
    stackRotate: -7,
    target: { x: 30, y: 34, rotate: 0, scale: s(1), w: 16, h: 20 },
    targetSm: { x: 22, y: 40 },
    z: 9,
  },
];

function tileFallbackForCategory(category: CatalogCategory): string {
  if (category.isCombo) return COMBO_CATEGORY_TILE_IMAGE;
  switch (category.kind) {
    case 'watch':
      return WATCH_CATEGORY_TILE_IMAGE;
    case 'bracelet':
      return BRACELET_CATEGORY_TILE_IMAGE;
    case 'jewellery':
      return JEWELLERY_CATEGORY_TILE_IMAGES.Necklaces;
    default:
      return COMBO_CATEGORY_TILE_IMAGE;
  }
}

function categoryTileItem(category: CatalogCategory): StackSpreadItem {
  const src = resolveMediaUrl(category.tileImageUrl) || tileFallbackForCategory(category);
  return { src, alt: category.label };
}

function productToStackItem(product: ProductSummary): StackSpreadItem {
  return {
    src: getProductDisplayImage(product),
    alt: product.name,
    href: `/products/${product.id}`,
  };
}

function dedupeItems(items: StackSpreadItem[]): StackSpreadItem[] {
  const seen = new Set<string>();
  const out: StackSpreadItem[] = [];
  for (const item of items) {
    const key = item.href ?? item.src;
    if (!item.src || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function expandToCardCount(items: StackSpreadItem[], count = STACK_SPREAD_CARD_COUNT): StackSpreadItem[] {
  if (items.length === 0) return [];
  const out: StackSpreadItem[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(items[i % items.length]!);
  }
  return out;
}

function fallbackItemsForCategory(category: CatalogCategory): StackSpreadItem[] {
  const pool: StackSpreadItem[] = [categoryTileItem(category)];
  const hero = getCategoryHeroContent(category);

  hero.images.forEach((src, index) => {
    pool.push({ src, alt: hero.imageAlts[index] ?? category.label });
  });

  if (category.kind === 'jewellery') {
    for (const [subcategory, src] of Object.entries(JEWELLERY_CATEGORY_TILE_IMAGES)) {
      pool.push({ src, alt: subcategory });
    }
  }

  return dedupeItems(pool);
}

function recentProductsForCategory(
  products: ProductSummary[],
  category: CatalogCategory,
  limit = STACK_SPREAD_CARD_COUNT,
): ProductSummary[] {
  const inCategory = products.filter(
    (product) => product.isActive !== false && productMatchesCategory(product.category, category),
  );

  return sortProductsByUpdatedDesc(inCategory).slice(0, limit);
}

function itemsForCategory(
  category: CatalogCategory,
  products: ProductSummary[],
): StackSpreadItem[] {
  const recentItems = recentProductsForCategory(products, category).map(productToStackItem);
  if (recentItems.length >= STACK_SPREAD_CARD_COUNT) {
    return expandToCardCount(dedupeItems(recentItems));
  }

  return expandToCardCount(dedupeItems([...recentItems, ...fallbackItemsForCategory(category)]));
}

function itemsForAllCategories(
  categories: CatalogCategory[],
  products: ProductSummary[],
): StackSpreadItem[] {
  const active = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const pool: StackSpreadItem[] = [];

  for (const category of active) {
    const latest = recentProductsForCategory(products, category, 1)[0];
    pool.push(latest ? productToStackItem(latest) : categoryTileItem(category));
  }

  if (pool.length < STACK_SPREAD_CARD_COUNT) {
    const recentAcrossCatalog = sortProductsByUpdatedDesc(
      products.filter((product) => product.isActive !== false),
    )
      .slice(0, STACK_SPREAD_CARD_COUNT)
      .map(productToStackItem);
    pool.push(...recentAcrossCatalog);
  }

  return expandToCardCount(dedupeItems(pool));
}

export function getCategoryStackSpreadItems(
  category: CatalogCategory | undefined,
  categories: CatalogCategory[],
  products: ProductSummary[],
): StackSpreadItem[] {
  if (category) return itemsForCategory(category, products);
  return itemsForAllCategories(categories, products);
}

export function buildStackSpreadCards(items: StackSpreadItem[]): StackSpreadCard[] {
  const resolved = expandToCardCount(items);
  return CARD_LAYOUTS.map((layout, index) => ({
    ...layout,
    item: resolved[index]!,
  }));
}
