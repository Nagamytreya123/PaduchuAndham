import type { Variants } from 'framer-motion';

/** Premium SaaS easing — smooth deceleration, cinematic */
export const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

export const transitionPremium = (duration = 0.55) =>
  ({
    duration,
    ease: PREMIUM_EASE,
  }) as const;

export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 1.02,
    filter: 'blur(10px)',
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: transitionPremium(0.65),
  },
};

export const blurReveal: Variants = {
  hidden: { opacity: 0, filter: 'blur(12px)', scale: 1.04, y: 24 },
  show: {
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
    y: 0,
    transition: transitionPremium(0.72),
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionPremium(0.5),
  },
};

export const slideIn: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: transitionPremium(0.45),
  },
};

export const staggerContainer = (stagger = 0.08, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: transitionPremium(0.55),
  },
};

export const floatingAnimation = (reduced: boolean) =>
  reduced
    ? {}
    : {
        y: [0, -4, 0],
        transition: {
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };
