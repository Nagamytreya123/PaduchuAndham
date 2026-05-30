import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type Props = HTMLMotionProps<'div'> & { children: ReactNode };

/** Full-width motion wrapper for nested admin sections (route transitions stay in AdminShell). */
export function PageTransitionWrapper({ children, ...rest }: Props) {
  return (
    <motion.div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }} {...rest}>
      {children}
    </motion.div>
  );
}
