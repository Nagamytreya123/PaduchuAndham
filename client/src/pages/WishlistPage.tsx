import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { editorialSurface, editorialUnderlineSx } from '../constants/editorialSurface';
import { useWishlist, isComboWishlistId, type WishlistItem } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { formatInrFromPaise } from '../utils/format';
import { IconClose } from '../icons';
import IconButton from '@mui/material/IconButton';

const LAYOUT_SLOTS = [
  { gridColumn: { md: '1 / span 7' }, aspectRatio: '1 / 1', mt: 0 },
  { gridColumn: { md: '9 / span 4' }, aspectRatio: '1 / 1', mt: { md: 12 } },
  { gridColumn: { md: '1 / span 5' }, aspectRatio: '4 / 5', mt: { md: -16 } },
  { gridColumn: { md: '7 / span 6' }, aspectRatio: '1 / 1', mt: 0 },
] as const;

function WishlistProductBlock({
  item,
  layoutIndex,
  onRemove,
  onMoveToBag,
}: {
  item: WishlistItem;
  layoutIndex: number;
  onRemove: () => void;
  onMoveToBag: () => void;
}) {
  const slot = LAYOUT_SLOTS[layoutIndex % LAYOUT_SLOTS.length]!;
  const isWideFooter = layoutIndex % 4 === 3;
  const isCompact = layoutIndex % 4 === 1;

  return (
    <Box
      sx={{
        gridColumn: { xs: '1 / -1', ...slot.gridColumn },
        mt: slot.mt,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          mb: 4,
          bgcolor: editorialSurface.surfaceDim,
          aspectRatio: slot.aspectRatio,
          overflow: 'hidden',
          '&:hover img': { transform: 'scale(1.05)' },
        }}
      >
        {item.image ? (
          <Box
            component="img"
            src={item.image}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.7s ease',
            }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: editorialSurface.surfaceDim }} />
        )}
        <IconButton
          aria-label="Remove from wishlist"
          onClick={onRemove}
          sx={{
            position: 'absolute',
            top: { xs: 16, md: 24 },
            right: { xs: 16, md: 24 },
            bgcolor: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(8px)',
            color: editorialSurface.onSurface,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
          }}
        >
          <IconClose fontSize="small" />
        </IconButton>
      </Box>

      {isWideFooter ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'flex-end' },
            gap: 3,
            borderTop: '1px solid rgba(198, 198, 198, 0.2)',
            pt: 4,
          }}
        >
          <Box>
            <Typography
              component={RouterLink}
              to={item.href}
              sx={{
                fontFamily: editorialSurface.font.headline,
                fontSize: { xs: '1.75rem', md: '2rem' },
                color: editorialSurface.onSurface,
                textDecoration: 'none',
              }}
            >
              {item.name}
            </Typography>
            {item.subtitle ? (
              <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, mt: 1 }}>
                {item.subtitle}
              </Typography>
            ) : null}
          </Box>
          <Box sx={{ textAlign: { sm: 'right' } }}>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 300, mb: 2 }}>
              {formatInrFromPaise(item.price)}
            </Typography>
            <Button
              onClick={onMoveToBag}
              sx={{
                bgcolor: editorialSurface.primary,
                color: editorialSurface.onPrimary,
                borderRadius: 0,
                px: 5,
                py: 1.75,
                ...editorialSurface.label,
                fontSize: '0.75rem',
                '&:hover': { bgcolor: '#3b3b3b' },
              }}
            >
              Move to Bag
            </Button>
          </Box>
        </Box>
      ) : isCompact ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography
              component={RouterLink}
              to={item.href}
              sx={{
                fontFamily: editorialSurface.font.headline,
                fontSize: '1.35rem',
                color: editorialSurface.onSurface,
                textDecoration: 'none',
              }}
            >
              {item.name}
            </Typography>
            <Typography sx={{ fontSize: '1rem', fontWeight: 300, mt: 0.5 }}>
              {formatInrFromPaise(item.price)}
            </Typography>
          </Box>
          <Button
            onClick={onMoveToBag}
            sx={{
              justifyContent: 'space-between',
              borderBottom: `1px solid ${editorialSurface.outlineVariant}`,
              borderRadius: 0,
              py: 2,
              color: editorialSurface.onSurface,
              ...editorialSurface.label,
              fontSize: '0.75rem',
            }}
            endIcon={<span aria-hidden>→</span>}
          >
            Move to Bag
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'flex-start' },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              component={RouterLink}
              to={item.href}
              sx={{
                fontFamily: editorialSurface.font.headline,
                fontSize: { xs: '1.5rem', md: '1.75rem' },
                color: editorialSurface.onSurface,
                textDecoration: 'none',
              }}
            >
              {item.name}
            </Typography>
            {item.subtitle ? (
              <Typography
                sx={{
                  ...editorialSurface.label,
                  color: editorialSurface.onSurfaceVariant,
                  mt: 0.5,
                  letterSpacing: '0.14em',
                }}
              >
                {item.subtitle}
              </Typography>
            ) : null}
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 300, mt: 2 }}>
              {formatInrFromPaise(item.price)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              gap: 3,
            }}
          >
            <Button
              onClick={onMoveToBag}
              sx={{
                bgcolor: editorialSurface.primary,
                color: editorialSurface.onPrimary,
                borderRadius: 0,
                px: 4,
                py: 1.5,
                ...editorialSurface.label,
                fontSize: '0.75rem',
                '&:hover': { bgcolor: '#3b3b3b' },
              }}
            >
              Move to Bag
            </Button>
            <Button
              onClick={onRemove}
              sx={{
                ...editorialSurface.label,
                fontSize: '0.6875rem',
                color: editorialSurface.onSurface,
                minWidth: 0,
                p: 0,
                ...editorialUnderlineSx,
              }}
            >
              Remove
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function WishlistPage() {
  const { items, remove } = useWishlist();
  const { add } = useCart();
  const navigate = useNavigate();

  function moveToBag(item: WishlistItem) {
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

      <Box component="main" sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 4, maxWidth: 1280, mx: 'auto' }}>
        <Box component="header" sx={{ mb: { xs: 6, md: 8 } }}>
          <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, mb: 2 }}>
            Curated Selection
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: { xs: '2.75rem', md: '3.5rem' },
              lineHeight: 1.1,
            }}
          >
            Wishlist
          </Typography>
          {items.length > 0 ? (
            <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, mt: 2 }}>
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
                columnGap: { md: 6 },
                rowGap: { xs: 8, md: 12 },
              }}
            >
              {items.map((item, index) => (
                <WishlistProductBlock
                  key={item.id}
                  item={item}
                  layoutIndex={index}
                  onRemove={() => remove(item.id)}
                  onMoveToBag={() => moveToBag(item)}
                />
              ))}
            </Box>

            <Box
              sx={{
                mt: { xs: 8, md: 16 },
                pt: 4,
                borderTop: '1px solid rgba(198, 198, 198, 0.15)',
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Typography sx={{ ...editorialSurface.label, color: editorialSurface.outline, letterSpacing: '0.3em' }}>
                Viewing {items.length} saved {items.length === 1 ? 'item' : 'items'}
              </Typography>
              <Button
                component={RouterLink}
                to="/shop"
                sx={{
                  ...editorialSurface.label,
                  fontSize: '0.75rem',
                  color: editorialSurface.onSurface,
                  minWidth: 0,
                  p: 0,
                  ...editorialUnderlineSx,
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
