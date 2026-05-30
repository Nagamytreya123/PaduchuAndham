import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../../api/client';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AdminPageHeader, DashboardCard, MetricCard, PageTransitionWrapper } from '../../components/admin/premium';
import { adminMetricsGridSx } from '../../constants/adminLayout';
import { staggerContainer, staggerItem } from '../../motion/variants';

export function DashboardPage() {
  const reduced = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{
    products: number;
    orders: number;
    reviews: number;
    avgRating: number | null;
  }>({ products: 0, orders: 0, reviews: 0, avgRating: null });

  useEffect(() => {
    void (async () => {
      try {
        const [p, o, rev] = await Promise.all([
          apiFetch<{ products: unknown[] }>('/api/products'),
          apiFetch<{ orders: unknown[] }>('/api/admin/orders'),
          apiFetch<{ summary: { total: number; averageRating: number | null } }>('/api/admin/reviews?limit=0'),
        ]);
        setCounts({
          products: p.products.length,
          orders: o.orders.length,
          reviews: rev.summary.total,
          avgRating: rev.summary.averageRating,
        });
      } catch {
        setCounts({ products: 0, orders: 0, reviews: 0, avgRating: null });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <AdminLoadingPlaceholder variant="dashboard" />;
  }

  return (
    <PageTransitionWrapper>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <AdminPageHeader
          title="Overview"
          description="At-a-glance metrics across your catalogue, fulfilment pipeline, and customer sentiment. Figures refresh from the same APIs used across admin tools."
        />

        <Box
          component={motion.div}
          variants={staggerContainer(0.09)}
          initial={reduced ? false : 'hidden'}
          animate="show"
          sx={adminMetricsGridSx}
        >
          <Box component={motion.div} variants={staggerItem} sx={{ minWidth: 0 }}>
            <MetricCard label="Products" value={counts.products} emphasize to="/admin/products" />
          </Box>
          <Box component={motion.div} variants={staggerItem} sx={{ minWidth: 0 }}>
            <MetricCard
              label="Orders"
              value={counts.orders}
              footnote="Recent fetch from admin orders"
              to="/admin/orders"
            />
          </Box>
          <Box component={motion.div} variants={staggerItem} sx={{ minWidth: 0 }}>
            <DashboardCard float sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
                Reviews
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                {counts.reviews}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg {counts.avgRating != null ? counts.avgRating.toFixed(1) : '—'} / 5
              </Typography>
              <Button
                component={RouterLink}
                to="/admin/reviews"
                variant="outlined"
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  mt: 'auto',
                  cursor: 'pointer',
                  borderRadius: 2,
                  transition: 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: (t) => t.shadows[4] },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                View all
              </Button>
            </DashboardCard>
          </Box>
        </Box>
      </Stack>
    </PageTransitionWrapper>
  );
}
