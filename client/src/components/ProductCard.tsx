import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router-dom';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';

export function ProductCard({ product }: { product: ProductSummary }) {
  const img = product.images[0];
  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;

  return (
    <Card elevation={0} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea component={RouterLink} to={`/products/${product.id}`} sx={{ flex: 1, alignItems: 'stretch' }}>
        <CardMedia
          component={img ? 'img' : 'div'}
          image={img || undefined}
          sx={{
            aspectRatio: '4/3',
            objectFit: 'cover',
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            minHeight: 160,
          }}
          loading="lazy"
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            <Chip label={product.category} size="small" sx={{ fontWeight: 600 }} />
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom noWrap>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
            {[
              product.subcategory,
              product.jewelryDetails?.materialType,
              product.watchDetails?.color,
            ]
              .filter(Boolean)
              .join(' · ') || product.description}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="subtitle2" color="primary.main">
              {formatInrFromPaise(product.price)}
            </Typography>
            {showCompare && (
              <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                {formatInrFromPaise(product.compareAtPrice!)}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
