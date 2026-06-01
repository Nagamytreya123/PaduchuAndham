import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { PdpLoadingState } from '../components/loading';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { IconAdd, IconRemove } from '../icons';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import { WishlistToggleButton } from '../components/WishlistToggleButton';
import { productToWishlistItem } from '../context/WishlistContext';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { allocateWatchBraceletBundle } from '../utils/bundlePricing';
import { ProductReviewsSection } from '../components/ProductReviewsSection';
import { ProductDetailGallery } from '../components/product/ProductDetailGallery';
import { CompleteTheLook } from '../components/product/CompleteTheLook';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { shopSurface } from '../constants/shopSurface';
import { trackViewItem } from '../analytics';
import { cacheProduct, getCachedProduct, seedCatalog } from '../utils/catalogCache';

const pdpTypography = shopSurface.pdpTypography;

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <Stack spacing={0.35}>
      <Typography sx={{ ...pdpTypography.label, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ ...pdpTypography.valueSerif, color: 'text.primary' }}>{value}</Typography>
    </Stack>
  );
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add, addBundle, remove } = useCart();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [catalog, setCatalog] = useState<ProductSummary[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [bundleBraceletId, setBundleBraceletId] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const viewItemTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!product?.id || viewItemTracked.current === product.id) return;
    viewItemTracked.current = product.id;
    trackViewItem({
      id: product.id,
      name: product.name,
      pricePaise: product.price,
      category: product.category,
    });
  }, [product]);

  useEffect(() => {
    viewItemTracked.current = null;
  }, [id]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        const active = data.products.filter((p) => p.isActive !== false);
        seedCatalog(active);
        setCatalog(active);
      } catch {
        setCatalog([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    setLoading(true);
    setNotFound(false);
    setFetchError(null);
    setProduct(null);

    void (async () => {
      try {
        const data = await apiFetch<{ product: ProductSummary }>(`/api/products/${id}`, { signal: ac.signal });
        if (ac.signal.aborted) return;
        cacheProduct(data.product);
        setProduct(data.product);
      } catch (e) {
        if (ac.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Failed to load product';
        setFetchError(msg);
        const cached = getCachedProduct(id);
        if (cached) {
          setProduct(cached);
          setNotFound(false);
        } else if (/not found/i.test(msg)) {
          setProduct(null);
          setNotFound(true);
        } else {
          setProduct(null);
          setNotFound(false);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ac.abort();
    };
  }, [id]);

  useEffect(() => {
    if (!id || catalog.length === 0) return;
    seedCatalog(catalog);
  }, [catalog, id]);

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
    return <PdpLoadingState aria-label="Loading product" />;
  }

  if (notFound) {
    return (
      <Box>
        <StorefrontHeader />
        <Stack spacing={1} sx={{ px: 2, py: 3 }}>
          <Typography color="text.secondary" sx={pdpTypography.body}>
            Product not found.{' '}
            <Button onClick={() => navigate('/')}>Back home</Button>
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box>
        <StorefrontHeader />
        <Stack spacing={1} sx={{ px: 2, py: 3 }}>
          <Typography color="text.secondary" sx={pdpTypography.body}>
            {fetchError ?? 'Failed to load product.'}
          </Typography>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </Stack>
      </Box>
    );
  }

  const img = product.images[0];
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

  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const materialValue =
    product.jewelryDetails?.materialType ??
    (product.materials?.length ? product.materials.join(', ') : '');
  const collectionLabel = [product.category, product.subcategory].filter(Boolean).join(' · ');

  return (
    <Box sx={{ pb: { xs: 10, sm: 4 } }}>
      <StorefrontHeader />

      {fetchError ? (
        <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', px: 2, pt: 1 }}>
          {fetchError}
        </Typography>
      ) : null}

      <ProductDetailGallery images={product.images} productName={product.name} />

      <Box sx={{ px: 2, pt: 3, maxWidth: 520, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Typography sx={{ ...pdpTypography.label, color: 'text.secondary' }}>
            {collectionLabel ? `Collection — ${collectionLabel}` : 'Collection'}
          </Typography>
          <WishlistToggleButton item={productToWishlistItem(product)} sx={{ mt: -0.5 }} />
        </Stack>

        <Typography component="h1" sx={{ ...pdpTypography.title, color: 'text.primary', mb: 1.5 }}>
          {product.name}
        </Typography>

        <Stack direction="row" alignItems="baseline" gap={1.5} flexWrap="wrap" sx={{ mb: 2.5 }}>
          <Typography sx={{ ...pdpTypography.price, color: 'primary.main' }}>
            {formatInrFromPaise(product.price)}
          </Typography>
          {showCompare ? (
            <Typography
              sx={{ ...pdpTypography.price, color: 'text.secondary', textDecoration: 'line-through', fontSize: '1rem' }}
            >
              {formatInrFromPaise(product.compareAtPrice!)}
            </Typography>
          ) : null}
        </Stack>

        {product.description?.trim() ? (
          <Typography sx={{ ...pdpTypography.body, color: 'text.secondary', mb: 3 }}>
            {product.description.trim()}
          </Typography>
        ) : null}

        <Stack spacing={2} sx={{ mb: 3 }}>
          <DetailRow label="Material" value={materialValue} />
          {product.watchDetails?.color ? (
            <DetailRow label="Colour" value={product.watchDetails.color} />
          ) : null}
          {product.dimensions?.displayNote ? (
            <DetailRow label="Size" value={product.dimensions.displayNote} />
          ) : null}
        </Stack>

        {showWatchBraceletPair && selectedBracelet && pairChargePaise != null && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'action.hover',
            }}
          >
            <Typography sx={{ ...pdpTypography.label, color: 'text.primary', mb: 1 }}>
              Buy with a matching bracelet
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
                        overflow: 'hidden',
                      }}
                    >
                      <FormControlLabel
                        value={b.id}
                        sx={{ alignItems: 'center', m: 0, px: 1, py: 0.75, width: '100%' }}
                        control={<Radio size="small" />}
                        label={
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                            <Box
                              component={thumb ? 'img' : 'div'}
                              src={thumb || undefined}
                              alt=""
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                objectFit: 'cover',
                                bgcolor: 'grey.200',
                              }}
                            />
                            <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                              {b.name}
                            </Typography>
                            <Link
                              component={RouterLink}
                              to={`/products/${b.id}`}
                              variant="caption"
                              onClick={(e) => e.stopPropagation()}
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
            <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
              <Typography sx={{ ...pdpTypography.price, color: 'primary.main' }}>
                {formatInrFromPaise(pairChargePaise)}
              </Typography>
              {bundleSave != null && bundleSave > 0 && (
                <Chip size="small" color="success" label={`Save ${formatInrFromPaise(bundleSave)}`} />
              )}
            </Stack>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              disabled={bundleMaxQty < 1}
              sx={{ ...pdpTypography.cta, py: 1.35 }}
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
              Add watch + bracelet
            </Button>
          </Paper>
        )}

        <Typography sx={{ ...pdpTypography.label, color: 'text.secondary', mb: 1 }}>Quantity</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <IconButton size="small" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="decrease">
            <IconRemove />
          </IconButton>
          <Typography sx={{ minWidth: 24, textAlign: 'center', ...pdpTypography.body }}>{commitQty}</Typography>
          <IconButton
            size="small"
            onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
            disabled={product.stock <= commitQty}
            aria-label="increase"
          >
            <IconAdd />
          </IconButton>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {product.stock} in stock
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={product.stock < 1}
          sx={{ ...pdpTypography.cta, py: 1.6, borderRadius: 0 }}
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
          Add to bag
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 1.25, ...pdpTypography.body, fontSize: '0.75rem' }}
        >
          Free express shipping on all orders.
        </Typography>

        {product.careInstructions ? (
          <Accordion
            elevation={0}
            disableGutters
            sx={{
              mt: 3,
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <AccordionSummary expandIcon={<Typography sx={pdpTypography.label}>+</Typography>}>
              <Typography sx={{ ...pdpTypography.label, color: 'text.primary' }}>Care instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ ...pdpTypography.body, color: 'text.secondary' }}>
                {product.careInstructions}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ) : null}

        {(product.materials?.length ?? 0) > 0 && (
          <Accordion
            elevation={0}
            disableGutters
            sx={{
              bgcolor: 'transparent',
              '&:before': { display: 'none' },
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <AccordionSummary expandIcon={<Typography sx={pdpTypography.label}>+</Typography>}>
              <Typography sx={{ ...pdpTypography.label, color: 'text.primary' }}>Materials</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction="row" gap={0.5} flexWrap="wrap">
                {product.materials.map((m) => (
                  <Chip key={m} label={m} size="small" variant="outlined" />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {(product.jewelryDetails || product.watchDetails) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            {product.jewelryDetails?.finishOrPlating ? (
              <DetailRow label="Finish" value={product.jewelryDetails.finishOrPlating} />
            ) : null}
            {product.jewelryDetails?.stoneOrMotif ? (
              <Box sx={{ mt: 1.5 }}>
                <DetailRow label="Stone / motif" value={product.jewelryDetails.stoneOrMotif} />
              </Box>
            ) : null}
          </Box>
        )}
      </Box>

      <CompleteTheLook product={product} catalog={catalog} />

      <Box sx={{ px: 2, maxWidth: 720, mx: 'auto' }}>
        <ProductReviewsSection productId={product.id} />
      </Box>
    </Box>
  );
}
