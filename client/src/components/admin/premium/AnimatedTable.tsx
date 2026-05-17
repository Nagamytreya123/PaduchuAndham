import type { ReactNode } from 'react';
import TableContainer, { type TableContainerProps } from '@mui/material/TableContainer';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { DashboardCard } from './DashboardCard';

type Props = TableContainerProps & {
  children: ReactNode;
  maxHeight?: number | string;
};

/**
 * Table shell with glass card, subtle reveal, sticky header support on Table.
 */
export function AnimatedTable({ children, maxHeight = 560, sx, className, ...rest }: Props) {
  const reduced = useReducedMotion();
  return (
    <DashboardCard sx={{ p: 0, overflow: 'hidden' }}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={['admin-scroll-thin w-full overflow-auto', className].filter(Boolean).join(' ')}
        style={{ maxHeight }}
      >
        <TableContainer sx={[{ width: '100%' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} {...rest}>
          {children}
        </TableContainer>
      </motion.div>
    </DashboardCard>
  );
}
