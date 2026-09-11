import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { BRAND_LOADER_MIN_MS } from '../constants/brandLoader';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Lazy route import that keeps the Suspense fallback visible for at least `minMs`. */
export function lazyWithMinimum<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  minMs = BRAND_LOADER_MIN_MS,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const started = Date.now();
    const mod = await factory();
    const remaining = minMs - (Date.now() - started);
    if (remaining > 0) await delay(remaining);
    return mod;
  });
}
