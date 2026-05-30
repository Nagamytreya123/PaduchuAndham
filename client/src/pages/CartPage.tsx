import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import { IconAdd, IconDelete, IconRemove } from '../icons';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import { useCart, type CartLine } from '../context/CartContext';
import { formatInrFromPaise } from '../utils/format';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../utils/productImage';
import { StorefrontPageShell } from '../components/StorefrontPageShell';
import { shopSurface } from '../constants/shopSurface';

function CartLineImage({ src, alt }: { src?: string; alt: string }) {
  return (
    <Box
      component="img"
      src={src?.trim() || PRODUCT_IMAGE_FALLBACK}
      alt={alt}
      onError={handleProductImageError}
      sx={{
        width: { xs: 72, sm: 80 },
        height: { xs: 72, sm: 80 },
        flexShrink: 0,
        borderRadius: 1,
        objectFit: 'cover',
        bgcolor: '#E8E8E8',
        border: '1px solid rgba(5, 11, 24, 0.08)',
      }}
    />
  );
}

type CartDisplayRow =
  | { kind: 'bundle'; groupId: string; title: string; unitTotalPaise: number; qty: number; image?: string }
  | { kind: 'single'; line: CartLine };

function toDisplayRows(lines: CartLine[]): CartDisplayRow[] {
  const seenBundle = new Set<string>();
  const rows: CartDisplayRow[] = [];
  for (const l of lines) {
    if (l.bundleGroupId) {
      if (seenBundle.has(l.bundleGroupId)) continue;
      seenBundle.add(l.bundleGroupId);
      rows.push({
        kind: 'bundle',
        groupId: l.bundleGroupId,
        title: l.bundleDisplayName ?? 'Bundle',
        unitTotalPaise: l.bundleUnitTotalPaise ?? l.price,
        qty: l.qty,
        image: l.bundleImage ?? l.image,
      });
    } else {
      rows.push({ kind: 'single', line: l });
    }
  }
  return rows;
}

export function CartPage() {
  const { lines, setQty, setBundleQty, remove, removeBundle, totalPaise } = useCart();
  const displayRows = useMemo(() => toDisplayRows(lines), [lines]);

  if (lines.length === 0) {
    return (
      <StorefrontPageShell>
        <Typography component="h1" sx={{ ...shopSurface.pageTitle, mb: 2 }}>
          Cart
        </Typography>
        <Typography sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted, mb: 3 }}>
          Your cart is empty.
        </Typography>
        <Button component={RouterLink} variant="contained" to="/shop" sx={shopSurface.cta}>
          Continue shopping
        </Button>
      </StorefrontPageShell>
    );
  }

  return (
    <StorefrontPageShell>
      <Stack spacing={2.5}>
        <Typography component="h1" sx={shopSurface.pageTitle}>
          Cart
        </Typography>
        {displayRows.map((row) =>
          row.kind === 'bundle' ? (
            <Paper key={row.groupId} elevation={0} sx={shopSurface.card}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
              >
                <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 0 }} alignItems="center">
                  <CartLineImage src={row.image} alt={row.title} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: shopSurface.font.display, fontWeight: 600, fontSize: '1.05rem' }}>
                      {row.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.5 }}>
                      {formatInrFromPaise(row.unitTotalPaise)} per set · {formatInrFromPaise(row.unitTotalPaise * row.qty)}{' '}
                      total
                    </Typography>
                    <Typography variant="caption" sx={{ color: shopSurface.inkMuted, display: 'block', mt: 0.5 }}>
                      Combined set (multiple SKUs)
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={() => setBundleQty(row.groupId, row.qty - 1)}
                    aria-label="decrease qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconRemove />
                  </IconButton>
                  <Typography sx={{ minWidth: 24, textAlign: 'center', color: shopSurface.ink }}>{row.qty}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setBundleQty(row.groupId, row.qty + 1)}
                    aria-label="increase qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconAdd />
                  </IconButton>
                  <IconButton color="error" onClick={() => removeBundle(row.groupId)} aria-label="remove">
                    <IconDelete />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            <Paper key={row.line.productId} elevation={0} sx={shopSurface.card}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
              >
                <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 0 }} alignItems="center">
                  <CartLineImage src={row.line.image} alt={row.line.name} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: shopSurface.font.display, fontWeight: 600, fontSize: '1.05rem' }}>
                      {row.line.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.5 }}>
                      {formatInrFromPaise(row.line.price)} each
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={() => setQty(row.line.productId, row.line.qty - 1)}
                    aria-label="decrease qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconRemove />
                  </IconButton>
                  <Typography sx={{ minWidth: 24, textAlign: 'center', color: shopSurface.ink }}>{row.line.qty}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setQty(row.line.productId, row.line.qty + 1)}
                    aria-label="increase qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconAdd />
                  </IconButton>
                  <IconButton color="error" onClick={() => remove(row.line.productId)} aria-label="remove">
                    <IconDelete />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ),
        )}

        <Paper elevation={0} sx={shopSurface.card}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontFamily: shopSurface.font.display, fontSize: '1.15rem', fontWeight: 600 }}>
              Total
            </Typography>
            <Typography sx={{ fontFamily: shopSurface.font.display, fontSize: '1.35rem', fontWeight: 600 }}>
              {formatInrFromPaise(totalPaise)}
            </Typography>
          </Stack>
          <Button component={RouterLink} fullWidth variant="contained" size="large" to="/checkout" sx={{ ...shopSurface.cta, mt: 2 }}>
            Proceed to checkout
          </Button>
        </Paper>
      </Stack>
    </StorefrontPageShell>
  );
}
