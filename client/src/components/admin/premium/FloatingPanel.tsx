import Box, { type BoxProps } from '@mui/material/Box';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export type FloatingPanelProps = BoxProps & {
  /** Slight entrance */
  animate?: boolean;
};

/**
 * Toolbar / filter strip with glass treatment.
 */
export function FloatingPanel({ children, sx, animate = true, ...rest }: FloatingPanelProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  return (
    <Box
      component={motion.div}
      initial={animate && !reduced ? { opacity: 0, y: 12, filter: 'blur(6px)' } : false}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      sx={[
        {
          p: 2,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          background: alpha(theme.palette.background.paper, 0.55),
          backdropFilter: reduced ? 'none' : 'blur(18px)',
          boxShadow: `0 8px 32px ${alpha('#000', 0.25)}`,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}
