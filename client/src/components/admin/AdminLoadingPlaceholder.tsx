import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { adminCardGridSx, adminMetricsGridSx } from '../../constants/adminLayout';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type AdminLoadingVariant = 'list' | 'dashboard' | 'grid' | 'reviews' | 'products';

type Props = { variant: AdminLoadingVariant };

export function AdminLoadingPlaceholder({ variant }: Props) {
  const reduced = useReducedMotion();
  const pulse = reduced
    ? undefined
    : {
        animate: { opacity: [0.7, 1] },
        transition: { duration: 1.15, repeat: Infinity, ease: 'easeInOut' as const },
      };

  const inner = (() => {
    switch (variant) {
      case 'dashboard':
        return (
          <Stack spacing={2}>
            <Skeleton variant="text" width={160} height={36} sx={{ bgcolor: 'action.hover' }} />
            <Box sx={adminMetricsGridSx}>
              {[0, 1, 2].map((i) => (
                <Paper key={i} sx={{ p: 2, border: 1, borderColor: 'divider', minWidth: 0 }}>
                  <Skeleton width="40%" height={20} sx={{ bgcolor: 'action.hover' }} />
                  <Skeleton width="55%" height={40} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                </Paper>
              ))}
            </Box>
          </Stack>
        );
      case 'grid':
        return (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Skeleton variant="text" width={200} height={36} sx={{ bgcolor: 'action.hover' }} />
              <Skeleton variant="rectangular" width={120} height={36} sx={{ bgcolor: 'action.hover' }} />
            </Stack>
            <Skeleton variant="text" width="100%" height={20} sx={{ maxWidth: 520, bgcolor: 'action.hover' }} />
            <Box sx={adminCardGridSx}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Paper key={i} sx={{ overflow: 'hidden', border: 1, borderColor: 'divider', minWidth: 0 }}>
                  <Skeleton variant="rectangular" height={160} sx={{ bgcolor: 'action.hover' }} />
                  <Box sx={{ p: 2 }}>
                    <Skeleton width="70%" height={24} sx={{ bgcolor: 'action.hover' }} />
                    <Skeleton width="40%" height={20} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                  </Box>
                </Paper>
              ))}
            </Box>
          </Stack>
        );
      case 'reviews':
        return (
          <Stack spacing={3}>
            <Stack spacing={0.5}>
              <Skeleton variant="text" width={280} height={32} sx={{ bgcolor: 'action.hover' }} />
              <Skeleton variant="text" width="90%" height={20} sx={{ maxWidth: 480, bgcolor: 'action.hover' }} />
            </Stack>
            <Box sx={adminMetricsGridSx}>
              {[0, 1, 2].map((i) => (
                <Paper key={i} sx={{ p: 2, height: 140, border: 1, borderColor: 'divider', minWidth: 0 }}>
                  <Skeleton width="50%" height={18} sx={{ bgcolor: 'action.hover' }} />
                  <Skeleton width="35%" height={36} sx={{ mt: 2, bgcolor: 'action.hover' }} />
                </Paper>
              ))}
            </Box>
            <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Skeleton variant="rectangular" height={40} sx={{ flex: 1, maxWidth: 400, bgcolor: 'action.hover' }} />
                <Skeleton variant="rectangular" width={100} height={40} sx={{ bgcolor: 'action.hover' }} />
              </Stack>
            </Paper>
            <Skeleton variant="text" width={200} height={28} sx={{ bgcolor: 'action.hover' }} />
            {[0, 1, 2].map((i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
                <Skeleton width="30%" height={22} sx={{ bgcolor: 'action.hover' }} />
                <Skeleton width="100%" height={18} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                <Skeleton width="85%" height={18} sx={{ mt: 0.5, bgcolor: 'action.hover' }} />
              </Paper>
            ))}
          </Stack>
        );
      case 'products':
        return (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width={140} height={36} sx={{ bgcolor: 'action.hover' }} />
                <Skeleton variant="text" width="95%" height={20} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                <Skeleton variant="text" width="80%" height={20} sx={{ mt: 0.5, bgcolor: 'action.hover' }} />
              </Box>
              <Skeleton variant="rectangular" width={140} height={44} sx={{ flexShrink: 0, bgcolor: 'action.hover' }} />
            </Stack>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" width={88} height={36} sx={{ bgcolor: 'action.hover' }} />
              ))}
            </Stack>
            {[0, 1, 2, 3].map((i) => (
              <Paper key={i} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Skeleton variant="rectangular" width={72} height={72} sx={{ bgcolor: 'action.hover' }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="50%" height={26} sx={{ bgcolor: 'action.hover' }} />
                    <Skeleton width="35%" height={20} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                    <Skeleton width="100%" height={18} sx={{ mt: 1, bgcolor: 'action.hover' }} />
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        );
      case 'list':
      default:
        return (
          <Stack spacing={2}>
            <Skeleton variant="text" width={120} height={36} sx={{ bgcolor: 'action.hover' }} />
            {[0, 1, 2, 3].map((i) => (
              <Paper key={i} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Skeleton width={100} height={28} sx={{ bgcolor: 'action.hover' }} />
                    <Skeleton width={80} height={28} sx={{ bgcolor: 'action.hover' }} />
                  </Stack>
                  <Skeleton width="70%" height={20} sx={{ bgcolor: 'action.hover' }} />
                  <Skeleton width="45%" height={18} sx={{ bgcolor: 'action.hover' }} />
                  <Skeleton variant="rectangular" width={280} height={40} sx={{ bgcolor: 'action.hover' }} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        );
    }
  })();

  return (
    <motion.div
      {...pulse}
      className={reduced ? undefined : 'admin-loading-shimmer'}
      style={{ willChange: reduced ? undefined : 'opacity' }}
    >
      {inner}
    </motion.div>
  );
}
