import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import { IconAdd, IconDelete, IconRemove } from '../icons';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import { cartStandaloneLineKey, useCart, type CartLine } from '../context/CartContext';
import { formatInrFromPaise } from '../utils/format';
import { SansDigitsText } from '../components/SansDigitsText';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../utils/productImage';
import { StorefrontPageShell } from '../components/StorefrontPageShell';
import { EmptyCartState } from '../components/cart/EmptyCartState';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { CouponPromoBanner } from '../components/CouponPromoBanner';
import { cartBlocksCoupons } from '../utils/couponEligibility';
import { editorialSurface } from '../constants/editorialSurface';
import { shopSurface } from '../constants/shopSurface';

function CartLineImage({
  src,
  alt,
  size = { xs: 72, sm: 80 },
}: {
  src?: string;
  alt: string;
  size?: { xs: number; sm: number };
}) {
  return (
    <Box
      component="img"
      src={src?.trim() || PRODUCT_IMAGE_FALLBACK}
      alt={alt}
      onError={handleProductImageError}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        objectFit: 'cover',
        bgcolor: '#E8E8E8',
        border: '1px solid rgba(5, 11, 24, 0.08)',
      }}
    />
  );
}

type BundleComponent = { productId: string; image?: string };

function bundleComponentsForGroup(lines: CartLine[], groupId: string): BundleComponent[] {
  const seen = new Set<string>();
  const components: BundleComponent[] = [];

  for (const line of lines.filter((entry) => entry.bundleGroupId === groupId)) {
    if (seen.has(line.productId)) continue;
    seen.add(line.productId);
    components.push({
      productId: line.productId,
      image: line.image?.trim() || line.bundleImage?.trim(),
    });
  }

  return components;
}

function productDetailPath(productId: string) {
  return `/products/${productId}`;
}

/** Best storefront page for a collapsed bundle row (combo listing, watch PDP, etc.). */
function bundlePrimaryPath(groupId: string, components: BundleComponent[]): string {
  const comboMatch = groupId.match(/^product-combo-([a-f\d]{24})$/i);
  if (comboMatch) return productDetailPath(comboMatch[1]);

  const watchMatch = groupId.match(/^watch-bracelet-([a-f\d]{24})-[a-f\d]{24}$/i);
  if (watchMatch) return productDetailPath(watchMatch[1]);

  const jewelleryMatch = groupId.match(/^jewellery-combo-([a-f\d]{24})$/i);
  if (jewelleryMatch && components[0]) return productDetailPath(components[0].productId);

  return components[0] ? productDetailPath(components[0].productId) : '/shop';
}

const cartItemLinkSx = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  alignItems: 'center',
  gap: 2,
  textDecoration: 'none',
  color: 'inherit',
  borderRadius: 1,
  transition: 'opacity 0.15s ease',
  '&:hover': { opacity: 0.88 },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: shopSurface.ink,
    outlineOffset: 2,
  },
};

function CartLineImageLink({
  to,
  src,
  alt,
  size = { xs: 72, sm: 80 },
}: {
  to: string;
  src?: string;
  alt: string;
  size?: { xs: number; sm: number };
}) {
  return (
    <Box component={RouterLink} to={to} sx={{ display: 'block', flexShrink: 0 }} aria-label={`View ${alt}`}>
      <CartLineImage src={src} alt={alt} size={size} />
    </Box>
  );
}

function CartBundleImages({
  components,
  alt,
  groupHref,
}: {
  components: BundleComponent[];
  alt: string;
  groupHref: string;
}) {
  if (components.length <= 1) {
    const component = components[0];
    const href = component ? productDetailPath(component.productId) : groupHref;
    return <CartLineImageLink to={href} src={component?.image} alt={alt} />;
  }

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
      {components.map((component) => (
        <CartLineImageLink
          key={component.productId}
          to={productDetailPath(component.productId)}
          src={component.image}
          alt={`${alt} — item`}
          size={{ xs: 64, sm: 72 }}
        />
      ))}
    </Stack>
  );
}

type CartDisplayRow =
  | {
      kind: 'bundle';
      groupId: string;
      title: string;
      unitTotalPaise: number;
      qty: number;
      components: BundleComponent[];
      href: string;
    }
  | { kind: 'single'; line: CartLine; href: string };

function toDisplayRows(lines: CartLine[]): CartDisplayRow[] {
  const seenBundle = new Set<string>();
  const rows: CartDisplayRow[] = [];
  for (const l of lines) {
    if (l.bundleGroupId) {
      if (seenBundle.has(l.bundleGroupId)) continue;
      seenBundle.add(l.bundleGroupId);
      const components = bundleComponentsForGroup(lines, l.bundleGroupId);
      rows.push({
        kind: 'bundle',
        groupId: l.bundleGroupId,
        title: l.bundleDisplayName ?? 'Bundle',
        unitTotalPaise: l.bundleUnitTotalPaise ?? l.price,
        qty: l.qty,
        components,
        href: bundlePrimaryPath(l.bundleGroupId, components),
      });
    } else {
      rows.push({
        kind: 'single',
        line: l,
        href: productDetailPath(l.productId),
      });
    }
  }
  return rows;
}

export function CartPage() {
  const { lines, setQty, setBundleQty, remove, removeBundle, totalPaise } = useCart();
  const displayRows = useMemo(() => toDisplayRows(lines), [lines]);
  const couponsBlocked = useMemo(() => cartBlocksCoupons(lines), [lines]);

  if (lines.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: editorialSurface.background,
          color: editorialSurface.onSurface,
          pb: { xs: 10, sm: 4 },
        }}
      >
        <StorefrontHeader />
        <Box
          component="main"
          sx={{
            width: '100%',
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            pt: { xs: 2.5, sm: 3 },
            pb: 4,
            boxSizing: 'border-box',
          }}
        >
          <EmptyCartState />
        </Box>
      </Box>
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
                  <CartBundleImages components={row.components} alt={row.title} groupHref={row.href} />
                  <Box
                    component={RouterLink}
                    to={row.href}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      textDecoration: 'none',
                      color: 'inherit',
                      borderRadius: 1,
                      transition: 'opacity 0.15s ease',
                      '&:hover': { opacity: 0.88 },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: shopSurface.ink,
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <Typography sx={{ fontFamily: shopSurface.font.display, fontWeight: 600, fontSize: '1.05rem', color: shopSurface.ink }}>
                      <SansDigitsText text={row.title} />
                    </Typography>
                    <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.5 }}>
                      <Box component="span" sx={shopSurface.amount}>
                        {formatInrFromPaise(row.unitTotalPaise)}
                      </Box>{' '}
                      per set ·{' '}
                      <Box component="span" sx={shopSurface.amount}>
                        {formatInrFromPaise(row.unitTotalPaise * row.qty)}
                      </Box>{' '}
                      total
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
            <Paper key={cartStandaloneLineKey(row.line)} elevation={0} sx={shopSurface.card}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
              >
                <Box component={RouterLink} to={row.href} sx={cartItemLinkSx}>
                  <CartLineImage src={row.line.image} alt={row.line.name} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: shopSurface.font.display, fontWeight: 600, fontSize: '1.05rem', color: shopSurface.ink }}>
                      <SansDigitsText text={row.line.name} />
                    </Typography>
                    <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.5 }}>
                      <Box component="span" sx={shopSurface.amount}>
                        {formatInrFromPaise(row.line.price)}
                      </Box>{' '}
                      each
                      {row.line.selectedSize ? ` · Size ${row.line.selectedSize}` : ''}
                    </Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={() => setQty(row.line.productId, row.line.qty - 1, row.line.selectedSize)}
                    aria-label="decrease qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconRemove />
                  </IconButton>
                  <Typography sx={{ minWidth: 24, textAlign: 'center', color: shopSurface.ink }}>{row.line.qty}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setQty(row.line.productId, row.line.qty + 1, row.line.selectedSize)}
                    aria-label="increase qty"
                    sx={{ color: shopSurface.ink }}
                  >
                    <IconAdd />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => remove(row.line.productId, row.line.selectedSize)}
                    aria-label="remove"
                  >
                    <IconDelete />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ),
        )}

        <Paper elevation={0} sx={shopSurface.card}>
          {!couponsBlocked ? <CouponPromoBanner subtotalPaise={totalPaise} cartLines={lines} /> : null}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
            <Typography sx={{ fontFamily: shopSurface.font.display, fontSize: '1.15rem', fontWeight: 600, color: shopSurface.ink }}>
              Total
            </Typography>
            <Typography sx={{ ...shopSurface.amountLg, fontSize: '1.35rem', color: shopSurface.ink }}>
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
