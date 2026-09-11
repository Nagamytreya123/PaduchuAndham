import { useLayoutEffect, useRef, useState } from 'react';

/** Returns -1 | 0 | 1 based on whether the active key moved left or right in `orderedKeys`. */
export function useCategorySlideDirection(
  activeKey: string,
  orderedKeys: readonly string[],
): number {
  const prevKeyRef = useRef(activeKey);
  const [direction, setDirection] = useState(0);

  useLayoutEffect(() => {
    const prevKey = prevKeyRef.current;
    if (prevKey === activeKey) return;

    const prevIndex = orderedKeys.indexOf(prevKey);
    const nextIndex = orderedKeys.indexOf(activeKey);

    if (prevIndex !== -1 && nextIndex !== -1) {
      setDirection(nextIndex > prevIndex ? 1 : -1);
    } else {
      setDirection(0);
    }

    prevKeyRef.current = activeKey;
  }, [activeKey, orderedKeys]);

  return direction;
}
