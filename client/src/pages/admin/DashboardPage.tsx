import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';
import { apiFetch } from '../../api/client';

export function DashboardPage() {
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
      }
    })();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Overview
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Products
            </Typography>
            <Typography variant="h4">{counts.products}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Orders (recent fetch)
            </Typography>
            <Typography variant="h4">{counts.orders}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Reviews
            </Typography>
            <Typography variant="h4">{counts.reviews}</Typography>
            <Typography variant="body2" color="text.secondary">
              Avg {counts.avgRating != null ? counts.avgRating.toFixed(1) : '—'} / 5
            </Typography>
            <Button component={RouterLink} to="/admin/reviews" size="small" variant="outlined" sx={{ alignSelf: 'flex-start', mt: 'auto' }}>
              View all
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
