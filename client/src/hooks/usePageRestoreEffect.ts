import { useEffect } from 'react';

/** Runs after the page is restored from bfcache or becomes visible again. */
export function usePageRestoreEffect(onRestore: () => void) {
  useEffect(() => {
    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(onRestore);
      });
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) run();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onRestore]);
}
