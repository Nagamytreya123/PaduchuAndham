import { useEffect, useRef, useState } from 'react';
import { BRAND_LOADER_MIN_MS } from '../constants/brandLoader';

/**
 * Keeps loading UI visible for at least `minimumMs` after each load starts,
 * even when the underlying request finishes sooner.
 */
export function useMinimumLoading(isLoading: boolean, minimumMs = BRAND_LOADER_MIN_MS): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      startedAtRef.current = Date.now();
      setVisible(true);
      return;
    }

    if (startedAtRef.current === null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumMs - elapsed);
    const timer = window.setTimeout(() => {
      setVisible(false);
      startedAtRef.current = null;
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [isLoading, minimumMs]);

  return visible;
}
