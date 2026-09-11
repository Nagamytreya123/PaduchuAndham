import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { editorialSurface } from '../constants/editorialSurface';
import { shopSurface } from '../constants/shopSurface';
import { useWishlist, isComboWishlistId, type WishlistItem } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useCategories } from '../context/CategoriesContext';
import { apiFetch } from '../api/client';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { SansDigitsText } from '../components/SansDigitsText';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../utils/productImage';
import { IconClose } from '../icons';

function WishlistCard({
  item,
  inStock,
  onRemove,
  onMoveToBag,
}: {
  item: WishlistItem;
  inStock: boolean;
  onRemove: () => void;
  onMoveToBag: () => void;
}) {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(255, 255, 255, 0.55)',
        border: '1px solid rgba(5, 11, 24, 0.08)',
        opacity: inStock ? 1 : 0.58,
        transition: 'opacity 0.25s ease',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          aspectRatio: '4 / 5',
          overflow: 'hidden',
          bgcolor: shopSurface.creamDeep,
          ...(inStock && { '&:hover img': { transform: 'scale(1.03)' } }),
        }}
      >
        <Box
          component={RouterLink}
          to={item.href}
          sx={{ display: 'block', width: '100%', height: '100%' }}
        >
          <Box
            component="img"
            src={item.image || PRODUCT_IMAGE_FALLBACK}
            alt={item.name}
            onError={handleProductImageError}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.45s ease',
              filter: inStock ? 'none' : 'grayscale(35%)',
            }}
          />
        </Box>
        {!inStock ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.42)',
              pointerEvents: 'none',
            }}
          >
            <Typography
              sx={{
                ...editorialSurface.label,
                fontSize: '0.65rem',
                letterSpacing: '0.16em',
                bgcolor: 'rgba(15, 15, 16, 0.88)',
                color: '#F5F0E6',
                px: 1.75,
                py: 0.9,
              }}
            >
              Out of stock
            </Typography>
          </Box>
        ) : null}
        <IconButton
          aria-label="Remove from wishlist"
          onClick={onRemove}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            color: editorialSurface.onSurface,
            boxShadow: '0 2px 8px rgba(5, 11, 24, 0.12)',
            '&:hover': { bgcolor: '#ffffff' },
          }}
        >
          <IconClose fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          p: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <Typography
            component={RouterLink}
            to={item.href}
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              lineHeight: 1.3,
              color: editorialSurface.onSurface,
              textDecoration: 'none',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              '&:hover': { color: shopSurface.inkMuted },
            }}
          >
            <SansDigitsText text={item.name} />
          </Typography>
          {item.subtitle ? (
            <Typography
              sx={{
                ...editorialSurface.label,
                color: editorialSurface.onSurfaceVariant,
                mt: 0.5,
                fontSize: '0.62rem',
                letterSpacing: '0.14em',
              }}
            >
              {item.subtitle}
            </Typography>
          ) : null}
          <Typography
            sx={{
              ...shopSurface.amount,
              fontSize: { xs: '0.95rem', sm: '1rem' },
              color: shopSurface.ink,
              mt: 1,
            }}
          >
            {formatInrFromPaise(item.price)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 'auto' }}>
          <Button
            fullWidth
            disabled={!inStock}
            onClick={onMoveToBag}
            sx={{
              bgcolor: editorialSurface.primary,
              color: editorialSurface.onPrimary,
              borderRadius: 0,
              py: 1.1,
              ...editorialSurface.label,
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              '&:hover': { bgcolor: '#3b3b3b' },
              '&.Mui-disabled': {
                bgcolor: 'rgba(5, 11, 24, 0.1)',
                color: 'rgba(5, 11, 24, 0.38)',
              },
            }}
          >
            Move to Bag
          </Button>
          <Button
            fullWidth
            onClick={onRemove}
            sx={{
              ...editorialSurface.label,
              fontSize: '0.62rem',
              letterSpacing: '0.12em',
              color: editorialSurface.onSurfaceVariant,
              minWidth: 0,
              py: 0.5,
              '&:hover': { bgcolor: 'transparent', color: editorialSurface.onSurface },
            }}
          >
            Remove
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export function WishlistPage() {
  const { items, remove } = useWishlist();
  const { add } = useCart();
  const { catalogRevision } = useCategories();
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        const next: Record<string, boolean> = {};
        for (const product of data.products) {
          next[product.id] = (product.stock ?? 0) > 0 && product.isActive !== false;
        }
        setAvailability(next);
      } catch {
        setAvailability({});
      }
    })();
  }, [items, catalogRevision]);

  const inStockForItem = useMemo(() => {
    return (item: WishlistItem) => {
      if (isComboWishlistId(item.id)) return true;
      return availability[item.id] === true;
    };
  }, [availability]);

  function moveToBag(item: WishlistItem) {
    if (!inStockForItem(item)) return;
    if (isComboWishlistId(item.id)) {
      navigate(item.href);
      return;
    }
    add({
      productId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      qty: 1,
    });
    navigate('/cart');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: editorialSurface.background,
        color: editorialSurface.onSurface,
        fontFamily: editorialSurface.font.body,
        pb: { xs: 12, sm: 4 },
      }}
    >
      <StorefrontHeader />

      <Box component="main" sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 4, maxWidth: 960, mx: 'auto' }}>
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, mb: 1 }}>
            Curated Selection
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: { xs: '2.25rem', md: '3rem' },
              lineHeight: 1.1,
            }}
          >
            Wishlist
          </Typography>
          {items.length > 0 ? (
            <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, mt: 1.5 }}>
              {items.length} {items.length === 1 ? 'item' : 'items'} saved
            </Typography>
          ) : null}
        </Box>

        {items.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: editorialSurface.font.headline,
                fontStyle: 'italic',
                fontSize: '1.5rem',
                mb: 2,
              }}
            >
              Your wishlist is empty
            </Typography>
            <Typography sx={{ color: editorialSurface.onSurfaceVariant, mb: 4, maxWidth: 360, mx: 'auto' }}>
              Tap the heart on any piece to save it here.
            </Typography>
            <Button
              component={RouterLink}
              to="/shop"
              sx={{
                bgcolor: editorialSurface.primary,
                color: editorialSurface.onPrimary,
                borderRadius: 0,
                px: 4,
                py: 1.5,
                ...editorialSurface.label,
                '&:hover': { bgcolor: '#3b3b3b' },
              }}
            >
              Browse shop
            </Button>
          </Box>
        ) : (
          <>
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {items.map((item) => (
                <Grid item xs={6} sm={6} md={6} key={item.id}>
                  <WishlistCard
                    item={item}
                    inStock={inStockForItem(item)}
                    onRemove={() => remove(item.id)}
                    onMoveToBag={() => moveToBag(item)}
                  />
                </Grid>
              ))}
            </Grid>

            <Box
              sx={{
                mt: { xs: 5, md: 6 },
                pt: 3,
                borderTop: '1px solid rgba(198, 198, 198, 0.15)',
                textAlign: 'center',
              }}
            >
              <Button
                component={RouterLink}
                to="/shop"
                sx={{
                  ...editorialSurface.label,
                  fontSize: '0.75rem',
                  color: editorialSurface.onSurface,
                  letterSpacing: '0.2em',
                  textDecoration: 'underline',
                  textUnderlineOffset: 4,
                }}
              >
                Continue shopping
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
