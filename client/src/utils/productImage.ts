import type { SyntheticEvent } from 'react';
import { verifiedImageAt } from '../constants/verifiedProductImages';

/** Fallback when a product image URL fails to load (404, hotlink, etc.) */
export const PRODUCT_IMAGE_FALLBACK = verifiedImageAt(0);

export function handleProductImageError(e: SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (el.dataset.fallbackApplied === '1') return;
  el.dataset.fallbackApplied = '1';
  el.src = PRODUCT_IMAGE_FALLBACK;
}
