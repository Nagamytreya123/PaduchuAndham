import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset window scroll on route changes. React Router does not scroll to top by default,
 * so navigating from a scrolled shop/wishlist list would land mid-page on PDP and similar routes.
 * Only pathname changes trigger a reset — hash/search updates on the same page (e.g. home #collection) are left alone.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
