import type { Transition, Variants } from 'framer-motion';

/** Premium deceleration — matches brand motion spec */
export const SHOWCASE_EASE = [0.22, 1, 0.36, 1] as const;

const tween = (duration: number, delay = 0): Transition => ({
  duration,
  ease: SHOWCASE_EASE,
  delay,
});

/** Settle: medium stiffness, high damping — micro overshoot only (spec §3.1 D) */
const settleSpring: Transition = {
  type: 'spring',
  stiffness: 240,
  damping: 38,
  mass: 0.9,
};

/**
 * Full hero shell: directional slide + scale + blur + z-index depth.
 * `custom`: +1 = advance (exit left, enter from right), -1 = back.
 * Exit ~700–950ms; total perceived beat under ~1.1s (spec §3.1).
 */
export const showcaseSlideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 260 : -260,
    scale: 1.09,
    opacity: 0,
    filter: 'blur(11px)',
    zIndex: 1,
  }),
  center: () => ({
    x: 0,
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    zIndex: 2,
    transition: {
      x: { type: 'spring', stiffness: 220, damping: 36, mass: 0.88 },
      opacity: { duration: 0.52, ease: SHOWCASE_EASE, delay: 0.05 },
      filter: { duration: 0.62, ease: SHOWCASE_EASE, delay: 0.06 },
      scale: {
        type: 'spring',
        stiffness: 280,
        damping: 34,
        mass: 0.88,
      },
    },
  }),
  exit: (dir: number) => ({
    x: dir >= 0 ? -280 : 280,
    scale: 0.92,
    opacity: 0,
    filter: 'blur(7px)',
    zIndex: 0,
    transition: {
      duration: 0.84,
      ease: SHOWCASE_EASE,
    },
  }),
};

/** Narrow viewports: smaller travel + scale so the card does not read as an oversized “wide strip” off-screen. */
export const showcaseSlideVariantsMobile: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 56 : -56,
    scale: 1.02,
    opacity: 0,
    filter: 'blur(6px)',
    zIndex: 1,
  }),
  center: () => ({
    x: 0,
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    zIndex: 2,
    transition: {
      x: { type: 'spring', stiffness: 260, damping: 38, mass: 0.85 },
      opacity: { duration: 0.38, ease: SHOWCASE_EASE, delay: 0.03 },
      filter: { duration: 0.45, ease: SHOWCASE_EASE, delay: 0.04 },
      scale: { type: 'spring', stiffness: 300, damping: 36, mass: 0.85 },
    },
  }),
  exit: (dir: number) => ({
    x: dir >= 0 ? -72 : 72,
    scale: 0.96,
    opacity: 0,
    filter: 'blur(5px)',
    zIndex: 0,
    transition: {
      duration: 0.55,
      ease: SHOWCASE_EASE,
    },
  }),
};

/** Softer slide when user prefers reduced motion */
export const showcaseSlideReduced: Variants = {
  enter: { x: 0, opacity: 0 },
  center: { x: 0, opacity: 1, transition: tween(0.2) },
  exit: { x: 0, opacity: 0, transition: tween(0.16) },
};

/** Parallax field: drifts opposite hero travel, ~15–25% distance feel vs product (spec §3.1 B–C) */
export const parallaxBgVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 22 : -22,
    opacity: 0.5,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: tween(1.12, 0.1),
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -16 : 16,
    opacity: 0.38,
    transition: tween(1.02),
  }),
};

/** Ambient wordmark — even slower than parallaxBg */
export const wordmarkParallaxVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 14 : -14,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: tween(1.28, 0.12),
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -10 : 10,
    opacity: 0.55,
    transition: tween(1.08),
  }),
};

export const wordmarkParallaxReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: tween(0.22) },
  exit: { opacity: 0, transition: tween(0.16) },
};

export const parallaxBgReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: tween(0.2) },
  exit: { opacity: 0, transition: tween(0.15) },
};

/**
 * Stagger: title → price → description → meta → nav/CTA last (spec §3.3).
 * delayChildren starts after hero motion begins.
 */
export const staggerTextContainer: Variants = {
  enter: {},
  center: {
    transition: {
      staggerChildren: 0.085,
      delayChildren: 0.36,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.035,
      staggerDirection: -1,
    },
  },
};

/** Incoming: fade + rise; outgoing: quick fade + slide opposite travel */
export const staggerTextItem: Variants = {
  enter: { opacity: 0, y: 20, filter: 'blur(8px)' },
  center: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: tween(0.52, 0),
  },
  exit: (dir: number) => {
    const d = dir ?? 1;
    return {
      opacity: 0,
      y: d >= 0 ? 12 : -12,
      x: d >= 0 ? 14 : -14,
      filter: 'blur(5px)',
      transition: tween(0.24),
    };
  },
};

export const staggerTextReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: tween(0.18) },
  exit: { opacity: 0, transition: tween(0.12) },
};

/** Hero product frame — optical weight on the dual stage */
export const imageFrameVariants: Variants = {
  enter: { scale: 1.045, opacity: 0.88 },
  center: {
    scale: 1,
    opacity: 1,
    transition: settleSpring,
  },
  exit: { scale: 0.94, opacity: 0.45, filter: 'blur(5px)', transition: tween(0.58) },
};

export const imageFrameReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: tween(0.2) },
  exit: { opacity: 0, transition: tween(0.16) },
};

/** Tighter image frame motion on small screens (single-column hero). */
export const imageFrameVariantsMobile: Variants = {
  enter: { scale: 1.02, opacity: 0.92 },
  center: {
    scale: 1,
    opacity: 1,
    transition: settleSpring,
  },
  exit: { scale: 0.97, opacity: 0.55, filter: 'blur(4px)', transition: tween(0.42) },
};

/** Idle float on hero product (6–12px, slow — spec §4) */
export function floatingIdle(reduced: boolean): false | { y: number[]; transition: { duration: number; repeat: number; ease: 'easeInOut' } } {
  if (reduced) return false;
  return {
    y: [0, -8, 0],
    transition: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
  };
}
