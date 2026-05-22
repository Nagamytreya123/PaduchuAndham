import type { Transition, Variants } from 'framer-motion';
import { SHOWCASE_EASE } from './productShowcaseVariants';

const tween = (duration: number, delay = 0): Transition => ({
  duration,
  ease: SHOWCASE_EASE,
  delay,
});

/** Backdrop — fade + subtle blur lift */
export const lightboxBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tween(0.28) },
  exit: { opacity: 0, transition: tween(0.22) },
};

/** Center panel — scale from thumbnail with spring settle */
export const lightboxPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.88, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 32,
      mass: 0.85,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    filter: 'blur(6px)',
    transition: tween(0.26),
  },
};

export const lightboxPanelReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tween(0.18) },
  exit: { opacity: 0, transition: tween(0.14) },
};

/** Slideshow inside lightbox */
export const lightboxSlideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 48 : -48,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: tween(0.38),
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? -40 : 40,
    opacity: 0,
    scale: 0.98,
    transition: tween(0.26),
  }),
};

export const lightboxSlideReduced: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: tween(0.16) },
  exit: { opacity: 0, transition: tween(0.12) },
};

export const lightboxThumbStrip: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.12, duration: 0.32, ease: SHOWCASE_EASE },
  },
  exit: { opacity: 0, y: 8, transition: tween(0.16) },
};
