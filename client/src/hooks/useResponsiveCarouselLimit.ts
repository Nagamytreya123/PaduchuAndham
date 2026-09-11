import { useEffect, useState } from 'react';

/** How many recent products to load into the coverflow at each breakpoint. */
export function getCarouselProductLimit(width: number): number {
  if (width >= 1280) return 9;
  if (width >= 768) return 7;
  return 5;
}

export function useResponsiveCarouselLimit(): number {
  const [limit, setLimit] = useState(() =>
    typeof window !== 'undefined' ? getCarouselProductLimit(window.innerWidth) : 5,
  );

  useEffect(() => {
    const onResize = () => setLimit(getCarouselProductLimit(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return limit;
}
