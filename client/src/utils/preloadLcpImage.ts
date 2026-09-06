import { resolveMediaUrl } from './productImage';

const preloaded = new Set<string>();

/** Synchronously inject a high-priority LCP image preload (call from useLayoutEffect). */
export function preloadLcpImage(imageUrl: string | undefined | null): void {
  const resolved = resolveMediaUrl(imageUrl ?? '');
  if (!resolved || resolved.startsWith('data:') || preloaded.has(resolved)) return;
  preloaded.add(resolved);

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = resolved;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
}
