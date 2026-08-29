import type { SyntheticEvent } from 'react';
import type { ProductSummary } from '../types/product';
import {
  BRACELET_CATEGORY_TILE_IMAGE,
  JEWELLERY_CATEGORY_TILE_IMAGES,
  WATCH_CATEGORY_TILE_IMAGE,
} from '../constants/categoryTileImages';
import type { JewellerySubcategoryPreset } from '../constants/jewellerySubcategories';
import { apiUrl } from '../api/client';

const GRAY_PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">' +
  '<rect fill="#E8E8E8" width="800" height="1000"/></svg>';

/** Neutral placeholder when a product image fails to load */
export const PRODUCT_IMAGE_FALLBACK =
  `data:image/svg+xml,${encodeURIComponent(GRAY_PLACEHOLDER_SVG)}`;

function mediaBaseOrigin(): string {
  return apiUrl('').replace(/\/$/, '');
}

/** Turn stored `/uploads/...` paths (or legacy absolute URLs) into a browser-loadable URL. */
export function resolveMediaUrl(url: string | undefined | null): string {
  const t = (url ?? '').trim();
  if (!t) return '';
  if (t.startsWith('data:') || t.startsWith('blob:')) return t;

  if (t.startsWith('http://') || t.startsWith('https://')) {
    try {
      const parsed = new URL(t);
      if (parsed.hostname.includes('drive.google.com')) {
        const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
        if (fileMatch?.[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
        }
      }
      if (parsed.pathname.startsWith('/uploads/')) {
        return resolveMediaUrl(parsed.pathname);
      }
    } catch {
      return t;
    }
    return t;
  }

  if (t.startsWith('/uploads/')) {
    const base = mediaBaseOrigin();
    return base ? `${base}${t}` : t;
  }

  return t;
}

export function resolveMediaUrls(urls: string[] | undefined | null): string[] {
  return (urls ?? []).map(resolveMediaUrl).filter(Boolean);
}

export function getCategoryPlaceholderImage(category: string, subcategory?: string): string {
  const key = category.trim().toLowerCase();
  if (key === 'watches' || key === 'watch') return WATCH_CATEGORY_TILE_IMAGE;
  if (key === 'bracelets' || key === 'bracelet') return BRACELET_CATEGORY_TILE_IMAGE;
  if ((key === 'jewellery' || key === 'jewelry') && subcategory) {
    const sub = subcategory as JewellerySubcategoryPreset;
    if (sub in JEWELLERY_CATEGORY_TILE_IMAGES) return JEWELLERY_CATEGORY_TILE_IMAGES[sub];
  }
  return PRODUCT_IMAGE_FALLBACK;
}

/** Primary storefront image: product upload first, then category placeholder. */
export function getProductDisplayImage(
  product: Pick<ProductSummary, 'images' | 'category' | 'subcategory'>,
): string {
  const uploaded = resolveMediaUrl(product.images[0]);
  if (uploaded) return uploaded;
  return getCategoryPlaceholderImage(product.category, product.subcategory);
}

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied === '1') return;
  el.dataset.fallbackApplied = '1';
  el.src = PRODUCT_IMAGE_FALLBACK;
}
