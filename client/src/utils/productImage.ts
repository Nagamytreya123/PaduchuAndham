import type { SyntheticEvent } from 'react';
import { PRODUCT_IMAGE_FALLBACK_URL } from '../constants/verifiedProductImages';

/** Fallback when a product image URL fails to load (404, hotlink, etc.) */
export const PRODUCT_IMAGE_FALLBACK = PRODUCT_IMAGE_FALLBACK_URL;

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied === '1') return;
  el.dataset.fallbackApplied = '1';
  el.src = PRODUCT_IMAGE_FALLBACK;
}
