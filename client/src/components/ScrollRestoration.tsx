import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

type ScrollCoords = { x: number; y: number };

/** Scroll positions keyed by React Router history entry (`location.key`). */
const scrollPositions = new Map<string, ScrollCoords>();

function readScrollPosition(): ScrollCoords {
  return {
    x: window.scrollX || document.documentElement.scrollLeft || 0,
    y: window.scrollY || document.documentElement.scrollTop || 0,
  };
}

function writeScrollPosition({ x, y }: ScrollCoords) {
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo(x, Math.min(y, maxY));
}

function scrollToHash(hash: string): boolean {
  if (!hash) return false;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ block: 'start' });
  return true;
}

/** Retry restore while lazy/async content is still growing the page height. */
function restoreScrollPosition(saved: ScrollCoords, attempt = 0) {
  writeScrollPosition(saved);

  const needsRetry =
    attempt < 12 &&
    document.documentElement.scrollHeight < saved.y + window.innerHeight * 0.5;

  if (needsRetry) {
    requestAnimationFrame(() => restoreScrollPosition(saved, attempt + 1));
  }
}

/**
 * Browser-like scroll behavior for SPA navigation:
 * - Back/forward restores the scroll position from when that history entry was left.
 * - Forward navigation to a new pathname scrolls to top (or in-page hash target).
 * - Same-pathname search/hash updates are left alone (e.g. home filters, #collection).
 * - REPLACE navigations never change scroll (filter chips, login redirects).
 */
export function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef(location.pathname);

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    const key = location.key;
    let ticking = false;

    function persist() {
      scrollPositions.set(key, readScrollPosition());
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(persist);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      scrollPositions.set(key, readScrollPosition());
    };
  }, [location.key]);

  useLayoutEffect(() => {
    const { pathname, hash, key } = location;
    const pathnameChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;

    function apply() {
      if (navigationType === 'POP') {
        const saved = scrollPositions.get(key);
        if (saved) {
          restoreScrollPosition(saved);
          return;
        }
      }

      if (navigationType === 'REPLACE') {
        return;
      }

      if (pathnameChanged) {
        if (scrollToHash(hash)) return;
        window.scrollTo(0, 0);
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }, [location, navigationType]);

  return null;
}
