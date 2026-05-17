import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';
import { DashboardCard } from './DashboardCard';
import { useAnimatedInteger } from '../../../hooks/useAnimatedInteger';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

type Props = {
  label: string;
  value: number;
  enabled?: boolean;
  footnote?: ReactNode;
  /** Larger typography for primary KPI */
  emphasize?: boolean;
  /** When set, the whole card navigates (e.g. dashboard shortcuts). */
  to?: LinkProps['to'];
};

/**
 * KPI tile with optional count-up. Wrap in `motion.div` + `variants={staggerItem}` when using stagger lists.
 */
export function MetricCard({ label, value, enabled = true, footnote, emphasize, to }: Props) {
  const reduced = useReducedMotion();
  const display = useAnimatedInteger(value, { enabled, reducedMotion: reduced });
  const linkProps = to
    ? ({ component: RouterLink, to } as const)
    : ({} as Record<string, never>);

  return (
    <DashboardCard
      float
      {...linkProps}
      sx={[
        { p: 2.5, height: '100%' },
        ...(to
          ? [
              {
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                display: 'block',
              },
            ]
          : []),
      ]}
      aria-label={to ? `Open ${label}` : undefined}
    >
      <Stack spacing={0.75}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
        >
          {label}
        </Typography>
        <Typography
          variant={emphasize ? 'h3' : 'h4'}
          sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}
        >
          {display}
        </Typography>
        {footnote != null ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
            {footnote}
          </Typography>
        ) : null}
      </Stack>
    </DashboardCard>
  );
}
