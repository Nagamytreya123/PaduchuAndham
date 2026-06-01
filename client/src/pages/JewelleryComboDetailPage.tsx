import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { PdpLoadingState } from '../components/loading';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import { WishlistToggleButton } from '../components/WishlistToggleButton';
import { comboToWishlistItem } from '../context/WishlistContext';
import { StorefrontHeader } from '../components/StorefrontHeader';
import type { JewelleryComboDetail } from '../types/jewelleryCombo';
import { formatInrFromPaise } from '../utils/format';
import { allocateListRatioBundle } from '../utils/bundlePricing';

export function JewelleryComboDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addBundle } = useCart();
  const [combo, setCombo] = useState<JewelleryComboDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await apiFetch<{ combo: JewelleryComboDetail }>(`/api/jewellery-combos/${id}`);
        setCombo(data.combo);
      } catch {
        setCombo(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <PdpLoadingState aria-label="Loading combo" />;
  }

  if (!combo || combo.products.length < 2) {
    return (
      <Typography color="text.secondary">
        Combo not found.{' '}
        <Button onClick={() => navigate('/')}>Back home</Button>
      </Typography>
    );
  }

  const hero = combo.images[0];
  const listPrices = combo.products.map((p) => p.price);
  const listSum = listPrices.reduce((a, b) => a + b, 0);
  const alloc = allocateListRatioBundle(listPrices, combo.price);
  const maxQty = Math.min(...combo.products.map((p) => p.stock || 0));
  const save = listSum > combo.price ? listSum - combo.price : null;

  return (
    <Stack spacing={2}>
      <StorefrontHeader />
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'grey.100',
          aspectRatio: '4/5',
          maxHeight: 520,
        }}
      >
        {hero ? (
          <Box component="img" src={hero} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <Box sx={{ height: '100%', minHeight: 200 }} />
        )}
        <WishlistToggleButton
          item={comboToWishlistItem(combo)}
          variant="overlay"
          sx={{ position: 'absolute', top: 16, right: 16 }}
        />
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Chip label="Jewellery combo set" color="secondary" size="small" sx={{ fontWeight: 700 }} />
        <WishlistToggleButton item={comboToWishlistItem(combo)} />
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {combo.name}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        This set is priced together. In your cart it appears as one line with the set total.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom>
          Pieces in this set
        </Typography>
        <Stack spacing={1.5}>
          {combo.products.map((p, i) => {
            const thumb = p.images[0];
            return (
              <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                <Box
                  component={thumb ? 'img' : 'div'}
                  src={thumb || undefined}
                  alt=""
                  sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover', bgcolor: 'grey.200' }}
                />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    List {formatInrFromPaise(p.price)} · Allocated in set {formatInrFromPaise(alloc[i] ?? 0)}
                  </Typography>
                </Stack>
                <Link component={RouterLink} to={`/products/${p.id}`} variant="caption">
                  Product page
                </Link>
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
        <Typography variant="h6" color="primary.main" fontWeight={800}>
          {formatInrFromPaise(combo.price)}
        </Typography>
        {listSum > combo.price && (
          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
            {formatInrFromPaise(listSum)}
          </Typography>
        )}
        {save != null && save > 0 && (
          <Chip size="small" color="success" label={`Save ${formatInrFromPaise(save)}`} />
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        In stock for full set: {maxQty}
      </Typography>

      <Button
        variant="contained"
        color="secondary"
        fullWidth
        disabled={maxQty < 1}
        onClick={() => {
          addBundle({
            groupId: `jewellery-combo-${combo.id}`,
            displayName: combo.name,
            unitTotalPaise: combo.price,
            image: hero ?? undefined,
            components: combo.products.map((p, i) => ({
              productId: p.id,
              name: p.name,
              unitPricePaise: alloc[i]!,
              image: p.images[0],
            })),
            qty: 1,
          });
          navigate('/cart');
        }}
      >
        Add set to cart — {formatInrFromPaise(combo.price)}
      </Button>
    </Stack>
  );
}
