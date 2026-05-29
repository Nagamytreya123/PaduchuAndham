import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router-dom';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { handleProductImageError } from '../utils/productImage';
import { EditorialImageFrame } from './EditorialImageFrame';
import { WishlistToggleButton } from './WishlistToggleButton';
import { productToWishlistItem } from '../context/WishlistContext';

const LIGHT_INK = '#1a1a1a';
const LIGHT_INK_MUTED = '#5c5c5c';
const LIGHT_PRICE = '#8B6B4A';

export function ProductCard({
  product,
  tone = 'dark',
  imageFrame = 'default',
}: {
  product: ProductSummary;
  /** Use `light` on cream/white storefront surfaces (dark theme defaults white text). */
  tone?: 'dark' | 'light';
  /** `editorial` = 4:5 studio frame (home / cart style). */
  imageFrame?: 'default' | 'editorial';
}) {
  const img = product.images[0];
  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const isLight = tone === 'light';
  const isEditorial = imageFrame === 'editorial';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(isEditorial && { bgcolor: 'transparent', border: 'none' }),
      }}
    >
      <CardActionArea component={RouterLink} to={`/products/${product.id}`} sx={{ flex: 1, alignItems: 'stretch' }}>
        <Box sx={{ position: 'relative' }}>
          {isEditorial && img ? (
            <EditorialImageFrame src={img} alt={product.name} inset />
          ) : isEditorial ? (
            <Box sx={{ width: '92%', mx: 'auto', aspectRatio: '4 / 5', bgcolor: '#E8E8E8' }} />
          ) : (
            <CardMedia
              component={img ? 'img' : 'div'}
              image={img || undefined}
              sx={{
                aspectRatio: '4/3',
                objectFit: 'cover',
                bgcolor: isLight ? '#e8e2d8' : 'rgba(255, 255, 255, 0.05)',
                minHeight: 160,
              }}
              loading="lazy"
              onError={handleProductImageError}
            />
          )}
          <WishlistToggleButton
            item={productToWishlistItem(product)}
            variant="overlay"
            sx={{
              position: 'absolute',
              top: isEditorial ? { xs: 12, sm: 16 } : 8,
              right: isEditorial ? { xs: 'calc(4% + 8px)', sm: 'calc(4% + 12px)' } : 8,
              zIndex: 2,
            }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
            <Chip
              label={product.category}
              size="small"
              sx={{
                fontWeight: 600,
                ...(isLight && {
                  bgcolor: 'rgba(26, 26, 26, 0.08)',
                  color: LIGHT_INK,
                  border: '1px solid rgba(26, 26, 26, 0.14)',
                }),
              }}
            />
          </Stack>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: isLight ? LIGHT_INK : undefined }}
            gutterBottom
            noWrap
          >
            {product.name}
          </Typography>
          <Typography
            variant="body2"
            color={isLight ? undefined : 'text.secondary'}
            sx={{ mb: 1, color: isLight ? LIGHT_INK_MUTED : undefined }}
            noWrap
          >
            {[
              product.subcategory,
              product.jewelryDetails?.materialType,
              product.watchDetails?.color,
            ]
              .filter(Boolean)
              .join(' · ') || product.description}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography
              variant="subtitle2"
              color={isLight ? undefined : 'primary.main'}
              sx={{ color: isLight ? LIGHT_PRICE : undefined, fontWeight: 700 }}
            >
              {formatInrFromPaise(product.price)}
            </Typography>
            {showCompare && (
              <Typography
                variant="caption"
                color={isLight ? undefined : 'text.secondary'}
                sx={{
                  textDecoration: 'line-through',
                  color: isLight ? LIGHT_INK_MUTED : undefined,
                }}
              >
                {formatInrFromPaise(product.compareAtPrice!)}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
