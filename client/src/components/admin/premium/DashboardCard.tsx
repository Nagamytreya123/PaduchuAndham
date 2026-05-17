import Paper, { type PaperProps } from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export type DashboardCardProps = PaperProps & {
  /** Subtle idle depth pulse (no layout-heavy motion). */
  float?: boolean;
};

/**
 * Glass-style elevated surface for admin content blocks.
 */
export function DashboardCard({ float, children, sx, ...rest }: DashboardCardProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  return (
    <Paper
      elevation={0}
      {...rest}
      sx={[
        {
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.92)} 0%, ${alpha(
            '#141418',
            0.88,
          )} 100%)`,
          backdropFilter: reduced ? 'none' : 'blur(16px)',
          boxShadow: `0 4px 24px ${alpha('#000', 0.35)}, inset 0 1px 0 ${alpha('#fff', 0.04)}`,
          cursor: 'default',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          '@keyframes admin-dc-glow': {
            '0%, 100%': {
              boxShadow: `0 4px 24px ${alpha('#000', 0.35)}, inset 0 1px 0 ${alpha('#fff', 0.04)}`,
            },
            '50%': {
              boxShadow: `0 10px 40px ${alpha('#000', 0.42)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.08)}, inset 0 1px 0 ${alpha('#fff', 0.05)}`,
            },
          },
          animation: float && !reduced ? 'admin-dc-glow 9s ease-in-out infinite' : 'none',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 20px 50px ${alpha('#000', 0.45)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
          '&:active': {
            transform: 'translateY(-1px) scale(0.995)',
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
}
