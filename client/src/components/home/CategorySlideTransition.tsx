import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const SLIDE_DURATION = 0.34;
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_OFFSET = '36%';

type CategorySlideTransitionProps = {
  panelKey: string;
  direction: number;
  children: ReactNode;
  className?: string;
};

export function CategorySlideTransition({
  panelKey,
  direction,
  children,
  className,
}: CategorySlideTransitionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={panelKey}
          custom={direction}
          className="w-full"
          variants={{
            enter: (slideDirection: number) => ({
              x: slideDirection >= 0 ? SLIDE_OFFSET : `-${SLIDE_OFFSET}`,
              opacity: 0,
            }),
            center: { x: 0, opacity: 1 },
            exit: (slideDirection: number) => ({
              x: slideDirection >= 0 ? `-${SLIDE_OFFSET}` : SLIDE_OFFSET,
              opacity: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
