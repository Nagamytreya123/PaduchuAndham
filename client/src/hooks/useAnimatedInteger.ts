import { useEffect, useRef, useState } from 'react';

/**
 * Smooth count-up for metrics. Uses rAF + ease-out cubic; avoids layout thrash.
 */
export function useAnimatedInteger(
  target: number,
  options: { enabled: boolean; reducedMotion: boolean; durationMs?: number },
) {
  const { enabled, reducedMotion, durationMs = 900 } = options;
  const displayed = useRef(0);
  const [value, setValue] = useState(() => (reducedMotion || !enabled ? target : 0));

  useEffect(() => {
    if (reducedMotion || !enabled) {
      displayed.current = target;
      setValue(target);
      return;
    }
    const from = displayed.current;
    let raf = 0;
    const start = performance.now();
    const delta = target - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else displayed.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, reducedMotion, durationMs]);

  return value;
}
