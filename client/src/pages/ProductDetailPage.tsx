import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import { IconAdd, IconRemove } from '../icons';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { allocateWatchBraceletBundle } from '../utils/bundlePricing';
import { ProductReviewsSection } from '../components/ProductReviewsSection';
import { ProductShowcaseHero, PRODUCT_SHOWCASE_PREVIEW_LEN } from '../components/product/ProductShowcaseHero';

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, addBundle, remove } = useCart();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [catalog, setCatalog] = useState<ProductSummary[]>([]);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const catalogIndexRef = useRef<number>(-1);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bundleBraceletId, setBundleBraceletId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        setCatalog(data.products.filter((p) => p.isActive !== false));
      } catch {
        setCatalog([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!product || catalog.length === 0) return;
    const i = catalog.findIndex((p) => p.id === product.id);
    if (i < 0) return;
    if (catalogIndexRef.current >= 0 && catalogIndexRef.current !== i) {
      setSlideDirection(i > catalogIndexRef.current ? 1 : -1);
    }
    catalogIndexRef.current = i;
  }, [product?.id, catalog]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void (async () => {
      try {
        const data = await apiFetch<{ product: ProductSummary }>(`/api/products/${id}`);
        setProduct(data.product);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    setQty(1);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const br = product.matchingBracelets ?? [];
    if (br.length > 0) {
      setBundleBraceletId((prev) => {
        if (prev && br.some((b) => b.id === prev)) return prev;
        return br[0]?.id ?? null;
      });
    } else {
      setBundleBraceletId(null);
    }
  }, [product]);

  if (loading) {
    return <Skeleton variant="rounded" height={320} />;
  }

  if (!product) {
    return (
      <Typography color="text.secondary">
        Product not found.{' '}
        <Button onClick={() => navigate('/')}>Back home</Button>
      </Typography>
    );
  }

  const img = product.images[0];
  const catalogIdx = catalog.findIndex((p) => p.id === product.id);
  const prevProductId = catalogIdx > 0 ? catalog[catalogIdx - 1]!.id : null;
  const nextProductId = catalogIdx >= 0 && catalogIdx < catalog.length - 1 ? catalog[catalogIdx + 1]!.id : null;
  const peekNextProduct =
    catalogIdx >= 0 && catalogIdx < catalog.length - 1 ? catalog[catalogIdx + 1]! : null;

  function navigateToProduct(nextId: string, dir: 1 | -1) {
    setSlideDirection(dir);
    navigate(`/products/${nextId}`);
  }

  const descRest =
    (product.description?.length ?? 0) > PRODUCT_SHOWCASE_PREVIEW_LEN
      ? product.description!.slice(PRODUCT_SHOWCASE_PREVIEW_LEN).trim()
      : null;

  const commitQty = Math.min(Math.max(1, qty), product.stock || 1);

  const bracelets = product.matchingBracelets ?? [];
  const bundlePaiseRaw = product.watchBraceletBundlePrice;
  const hasBundleDeal =
    bundlePaiseRaw != null && bundlePaiseRaw > 0 && bracelets.length > 0;
  const bundlePaise = hasBundleDeal ? bundlePaiseRaw! : null;

  const selectedBracelet = bracelets.find((b) => b.id === bundleBraceletId) ?? null;
  const showWatchBraceletPair = bracelets.length > 0 && selectedBracelet != null;
  const listPairSum =
    showWatchBraceletPair && selectedBracelet ? product.price + selectedBracelet.price : null;
  const pairChargePaise =
    showWatchBraceletPair && selectedBracelet
      ? hasBundleDeal && bundlePaise != null
        ? bundlePaise
        : listPairSum!
      : null;
  const bundleSave =
    hasBundleDeal && listPairSum != null && bundlePaise != null && listPairSum > bundlePaise
      ? listPairSum - bundlePaise
      : null;
  const bundleMaxQty =
    showWatchBraceletPair && selectedBracelet
      ? Math.min(product.stock || 0, selectedBracelet.stock || 0)
      : 0;
  const bundleCommitQty = Math.min(commitQty, Math.max(1, bundleMaxQty));

  return (
    <Stack spacing={2}>
      <ProductShowcaseHero
        product={product}
        direction={slideDirection}
        prevId={prevProductId}
        nextId={nextProductId}
        peekNext={peekNextProduct}
        catalogIndex={catalogIdx >= 0 ? catalogIdx : 0}
        catalogLength={catalogIdx >= 0 ? catalog.length : 0}
        onNavigate={navigateToProduct}
      />

      {descRest ? (
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          {descRest}
        </Typography>
      ) : null}

      {showWatchBraceletPair && selectedBracelet && pairChargePaise != null && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>
            Buy with a matching bracelet
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            {hasBundleDeal
              ? 'Choose a bracelet and add both together at the special pair price. Shown as one set in your cart.'
              : 'Choose a bracelet and add both together at regular list prices. Shown as one set in your cart.'}
          </Typography>
          <FormControl component="fieldset" variant="standard" fullWidth sx={{ mb: 1.5 }}>
            <RadioGroup
              value={bundleBraceletId ?? ''}
              onChange={(e) => setBundleBraceletId(e.target.value)}
            >
              {bracelets.map((b) => {
                const thumb = b.images[0];
                return (
                  <Paper
                    key={b.id}
                    elevation={0}
                    sx={{
                      mb: 1,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: bundleBraceletId === b.id ? 'primary.main' : 'divider',
                      bgcolor: bundleBraceletId === b.id ? 'background.paper' : 'transparent',
                      overflow: 'hidden',
                    }}
                  >
                    <FormControlLabel
                      value={b.id}
                      sx={{ alignItems: 'center', m: 0, px: 1, py: 0.75, width: '100%' }}
                      control={<Radio size="small" />}
                      label={
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', py: 0.25 }}>
                          <Box
                            component={thumb ? 'img' : 'div'}
                            src={thumb || undefined}
                            alt=""
                            sx={{
                              width: 48,
                              height: 48,
                              flexShrink: 0,
                              borderRadius: 1,
                              objectFit: 'cover',
                              bgcolor: 'grey.200',
                            }}
                          />
                          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {b.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              List {formatInrFromPaise(b.price)}
                              {b.sku ? ` · ${b.sku}` : ''}
                            </Typography>
                          </Stack>
                          <Link
                            component={RouterLink}
                            to={`/products/${b.id}`}
                            variant="caption"
                            onClick={(e) => e.stopPropagation()}
                            sx={{ flexShrink: 0 }}
                          >
                            Details
                          </Link>
                        </Stack>
                      }
                    />
                  </Paper>
                );
              })}
            </RadioGroup>
          </FormControl>

          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
              <Typography variant="h6" color="primary.main" fontWeight={800}>
                {formatInrFromPaise(pairChargePaise)}
              </Typography>
              {hasBundleDeal && listPairSum != null && bundlePaise != null && listPairSum > bundlePaise && (
                <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                  {formatInrFromPaise(listPairSum)}
                </Typography>
              )}
              {bundleSave != null && bundleSave > 0 && (
                <Chip size="small" color="success" label={`Save ${formatInrFromPaise(bundleSave)}`} />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              In stock for this pair: {bundleMaxQty} (watch {product.stock}, bracelet {selectedBracelet.stock})
            </Typography>
          </Stack>

          <Button
            variant="contained"
            color="secondary"
            fullWidth
            disabled={bundleMaxQty < 1}
            onClick={() => {
              const alloc = allocateWatchBraceletBundle(
                product.price,
                selectedBracelet.price,
                pairChargePaise,
              );
              addBundle({
                groupId: `watch-bracelet-${product.id}-${selectedBracelet.id}`,
                displayName: `${product.name} + ${selectedBracelet.name}`,
                unitTotalPaise: pairChargePaise,
                image: img,
                components: [
                  {
                    productId: product.id,
                    name: product.name,
                    unitPricePaise: alloc.watchUnitPaise,
                    image: img,
                  },
                  {
                    productId: selectedBracelet.id,
                    name: selectedBracelet.name,
                    unitPricePaise: alloc.braceletUnitPaise,
                    image: selectedBracelet.images[0],
                  },
                ],
                qty: bundleCommitQty,
              });
              navigate('/cart');
            }}
          >
            Add watch + bracelet — {formatInrFromPaise(pairChargePaise * bundleCommitQty)}
            {bundleCommitQty > 1 ? ` (${bundleCommitQty} pairs)` : ''}
          </Button>
        </Paper>
      )}

      <Typography variant="body2">
        <strong>In stock:</strong> {product.stock}
      </Typography>

      {(product.materials?.length ?? 0) > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Materials
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {product.materials.map((m) => (
              <Chip key={m} label={m} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}

      {(product.tags?.length ?? 0) > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Tags
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {product.tags.map((t) => (
              <Chip key={t} label={t} size="small" color="secondary" variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}

      {product.jewelryDetails && Object.values(product.jewelryDetails).some(Boolean) && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Jewellery details
          </Typography>
          <Stack component="dl" spacing={0.5} sx={{ m: 0, pl: 0 }}>
            {product.jewelryDetails.materialType && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  Material type
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.jewelryDetails.materialType}
                </Typography>
              </Stack>
            )}
            {product.jewelryDetails.finishOrPlating && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  Finish / plating
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.jewelryDetails.finishOrPlating}
                </Typography>
              </Stack>
            )}
            {product.jewelryDetails.stoneOrMotif && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  Stone / motif
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.jewelryDetails.stoneOrMotif}
                </Typography>
              </Stack>
            )}
            {product.jewelryDetails.customizationNote && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                  Customization
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.jewelryDetails.customizationNote}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
      )}

      {product.watchDetails && Object.values(product.watchDetails).some(Boolean) && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Watch details
          </Typography>
          <Stack component="dl" spacing={0.5} sx={{ m: 0, pl: 0 }}>
            {product.watchDetails.caseShape && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Case shape
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.watchDetails.caseShape}
                </Typography>
              </Stack>
            )}
            {product.watchDetails.dial && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Dial
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.watchDetails.dial}
                </Typography>
              </Stack>
            )}
            {product.watchDetails.strapType && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Strap / attachment
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.watchDetails.strapType}
                </Typography>
              </Stack>
            )}
            {product.watchDetails.color && (
              <Stack component="div" direction="row" gap={1} flexWrap="wrap">
                <Typography component="dt" variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                  Colour
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {product.watchDetails.color}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Box>
      )}

      {product.dimensions?.displayNote && (
        <Typography variant="body2">
          <strong>Size / dimensions:</strong> {product.dimensions.displayNote}
        </Typography>
      )}

      {product.weightGrams != null && (
        <Typography variant="body2" color="text.secondary">
          Approx. packed weight: {product.weightGrams} g
        </Typography>
      )}

      {product.careInstructions && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Care
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {product.careInstructions}
            </Typography>
          </Box>
        </>
      )}

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2">Qty</Typography>
        <IconButton size="small" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="decrease">
          <IconRemove />
        </IconButton>
        <Typography sx={{ minWidth: 24, textAlign: 'center' }}>{commitQty}</Typography>
        <IconButton
          size="small"
          onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
          disabled={product.stock <= commitQty}
          aria-label="increase"
        >
          <IconAdd />
        </IconButton>
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={product.stock < 1}
        onClick={() => {
          remove(product.id);
          add({
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: commitQty,
            image: img,
          });
          navigate('/cart');
        }}
      >
        Add to cart
      </Button>

      <ProductReviewsSection productId={product.id} />
    </Stack>
  );
}
