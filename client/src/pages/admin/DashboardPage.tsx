import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { apiFetch } from '../../api/client';

export function DashboardPage() {
  const [counts, setCounts] = useState<{ products: number; orders: number }>({ products: 0, orders: 0 });

  useEffect(() => {
    void (async () => {
      try {
        const [p, o] = await Promise.all([
          apiFetch<{ products: unknown[] }>('/api/products'),
          apiFetch<{ orders: unknown[] }>('/api/admin/orders'),
        ]);
        setCounts({ products: p.products.length, orders: o.orders.length });
      } catch {
        setCounts({ products: 0, orders: 0 });
      }
    })();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Overview
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Products
            </Typography>
            <Typography variant="h4">{counts.products}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Orders (recent fetch)
            </Typography>
            <Typography variant="h4">{counts.orders}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
