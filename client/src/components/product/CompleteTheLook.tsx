import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import type { ProductSummary } from '../../types/product';
import { ProductCard } from '../ProductCard';
import { shopSurface } from '../../constants/shopSurface';

type CompleteTheLookProps = {
  product: ProductSummary;
  catalog: ProductSummary[];
};

export function CompleteTheLook({ product, catalog }: CompleteTheLookProps) {
  const related = catalog
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  if (related.length === 0) return null;

  return (
    <Box sx={{ px: 2, py: 6, bgcolor: shopSurface.creamDeep }}>
      <Typography
        sx={{
          fontFamily: shopSurface.font.display,
          fontSize: '1.5rem',
          mb: 3,
          color: shopSurface.ink,
        }}
      >
        Complete the look
      </Typography>
      <Grid container spacing={2}>
        {related.map((p) => (
          <Grid item xs={12} sm={6} key={p.id}>
            <ProductCard product={p} tone="light" imageFrame="editorial" />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
