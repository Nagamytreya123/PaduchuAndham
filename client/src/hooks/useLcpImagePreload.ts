import { useLayoutEffect } from 'react';
import { preloadLcpImage } from '../utils/preloadLcpImage';

/** Inject a high-priority preload link for the LCP hero image as soon as the URL is known. */
export function useLcpImagePreload(imageUrl: string | undefined | null): void {
  useLayoutEffect(() => {
    preloadLcpImage(imageUrl);
  }, [imageUrl]);
}
