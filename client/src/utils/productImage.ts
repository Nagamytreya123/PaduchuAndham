import type { SyntheticEvent } from 'react';
import type { ProductSummary } from '../types/product';
import {
  BRACELET_CATEGORY_TILE_IMAGE,
  JEWELLERY_CATEGORY_TILE_IMAGES,
  WATCH_CATEGORY_TILE_IMAGE,
} from '../constants/categoryTileImages';
import type { JewellerySubcategoryPreset } from '../constants/jewellerySubcategories';

const GRAY_PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">' +
  '<rect fill="#E8E8E8" width="800" height="1000"/></svg>';

/** Neutral placeholder when a product image fails to load */
export const PRODUCT_IMAGE_FALLBACK =
  `data:image/svg+xml,${encodeURIComponent(GRAY_PLACEHOLDER_SVG)}`;

function mediaBaseOrigin(): string {
  const mediaOrigin = (import.meta.env.VITE_MEDIA_ORIGIN ?? '').replace(/\/$/, '');
  if (mediaOrigin) return mediaOrigin;

  const raw = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  if (!raw || typeof window === 'undefined') return raw;

  try {
    const api = new URL(raw);
    // Dev: load /uploads through the Vite origin (proxied) when API and files are both local.
    if (
      import.meta.env.DEV &&
      api.hostname === window.location.hostname &&
      api.port !== window.location.port
    ) {
      return '';
    }
    if (api.origin !== window.location.origin) return raw;
  } catch {
    return raw;
  }
  return raw;
}

/** Turn stored `/uploads/...` paths (or legacy absolute URLs) into a browser-loadable URL. */
export function resolveMediaUrl(url: string | undefined | null): string {
  const t = (url ?? '').trim();
  if (!t) return '';
  if (t.startsWith('data:') || t.startsWith('blob:')) return t;

  if (t.startsWith('http://') || t.startsWith('https://')) {
    try {
      const parsed = new URL(t);
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
  if (category === 'Watches') return WATCH_CATEGORY_TILE_IMAGE;
  if (category === 'Bracelets') return BRACELET_CATEGORY_TILE_IMAGE;
  if (category === 'Jewellery' && subcategory) {
    const key = subcategory as JewellerySubcategoryPreset;
    if (key in JEWELLERY_CATEGORY_TILE_IMAGES) return JEWELLERY_CATEGORY_TILE_IMAGES[key];
  }
  return BRACELET_CATEGORY_TILE_IMAGE;
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
