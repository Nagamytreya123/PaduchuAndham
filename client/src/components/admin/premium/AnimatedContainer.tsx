import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { Variants } from 'framer-motion';
import { fadeUp, staggerContainer, blurReveal, scaleIn, slideIn } from '../../../motion/variants';

type VariantKey = 'fadeUp' | 'blurReveal' | 'scaleIn' | 'slideIn';

export type AnimatedContainerProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate'> & {
  variant?: VariantKey;
  stagger?: number;
  /** Children can use `variants` with staggerItem / custom item variants */
  asStaggerRoot?: boolean;
};

const variantMap: Record<VariantKey, Variants> = {
  fadeUp,
  blurReveal,
  scaleIn,
  slideIn,
};

/**
 * Section / block wrapper with blur-to-focus style presets.
 */
export const AnimatedContainer = forwardRef<HTMLDivElement, AnimatedContainerProps>(function AnimatedContainer(
  { variant = 'fadeUp', stagger = 0.08, asStaggerRoot, children, className, ...rest },
  ref,
) {
  const reduced = useReducedMotion();
  const variants = asStaggerRoot ? staggerContainer(stagger) : variantMap[variant];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : 'hidden'}
      animate="show"
      variants={variants}
      style={{ width: '100%', willChange: reduced ? undefined : 'transform, opacity, filter' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
