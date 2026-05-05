import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';

import type { ProductSummary } from '../types/product';

const CATEGORY_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Sarees', value: 'Sarees' },
  { label: 'Handmade Jewellery', value: 'Handmade Jewellery' },
];

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') ?? '';

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products${q}`);
        setProducts(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  return (
    <Box>
      <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Featured products
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tap a product to view details and add to cart.
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {CATEGORY_FILTERS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            color={category === f.value ? 'primary' : 'default'}
            onClick={() => {
              if (f.value) setSearchParams({ category: f.value });
              else setSearchParams({});
            }}
            sx={{ fontWeight: category === f.value ? 700 : 400 }}
          />
        ))}
      </Stack>

      {loading && (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((k) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={k}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      )}

      {error && (
        <Typography color="error" role="alert">
          {error}
        </Typography>
      )}

      {!loading && !error && products.length === 0 && (
        <Typography color="text.secondary">No products in this category yet.</Typography>
      )}

      {!loading && !error && products.length > 0 && (
        <Grid container spacing={2}>
          {products.map((p) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
              <ProductCard product={p} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
