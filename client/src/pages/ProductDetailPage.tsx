import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { useCategories } from '../context/CategoriesContext';
import { categoryUsesSizeOptions } from '../utils/catalogCategory';
import { WishlistToggleButton } from '../components/WishlistToggleButton';
import { productToWishlistItem } from '../context/WishlistContext';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { allocateWatchBraceletBundle, allocateListRatioBundle } from '../utils/bundlePricing';
import { ProductDetailGallery } from '../components/product/ProductDetailGallery';
import { ProductDescription } from '../components/product/ProductDescription';
import { SansDigitsText } from '../components/SansDigitsText';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { shopSurface } from '../constants/shopSurface';
import { trackViewItem } from '../analytics';
import { cacheProduct, getCachedProduct } from '../utils/catalogCache';
import { getProductDisplayImage } from '../utils/productImage';
import { preloadLcpImage } from '../utils/preloadLcpImage';
import { useLcpImagePreload } from '../hooks/useLcpImagePreload';
import { useMinimumLoading } from '../hooks/useMinimumLoading';

const ExploreCategoryRows = lazy(() =>
  import('../components/product/ExploreCategoryRows').then((m) => ({ default: m.ExploreCategoryRows })),
);
const ProductReviewsSection = lazy(() =>
  import('../components/ProductReviewsSection').then((m) => ({ default: m.ProductReviewsSection })),
);

const PRODUCT_ID_RE = /^[a-fA-F0-9]{24}$/;

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
  const { categories } = useCategories();
  const [product, setProduct] = useState<ProductSummary | null>(() =>
    id && PRODUCT_ID_RE.test(id) ? getCachedProduct(id) ?? null : null,
  );
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(() => {
    if (!id || !PRODUCT_ID_RE.test(id)) return false;
    return !getCachedProduct(id);
  });
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const showLoading = useMinimumLoading(loading);
  const [bundleBraceletId, setBundleBraceletId] = useState<string | null>(null);
  const [bundleWatchId, setBundleWatchId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const viewItemTracked = useRef<string | null>(null);
  const lcpImageUrl = useMemo(
    () => (product ? getProductDisplayImage(product) : undefined),
    [product],
  );
  useLcpImagePreload(lcpImageUrl);

  useLayoutEffect(() => {
    if (!id || !PRODUCT_ID_RE.test(id)) return;
    const cached = getCachedProduct(id);
    if (cached) {
      preloadLcpImage(getProductDisplayImage(cached));
    }
  }, [id]);

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
    if (!id) return;
    if (!PRODUCT_ID_RE.test(id)) {
      setLoading(false);
      setNotFound(true);
      setProduct(null);
      setFetchError(null);
      return;
    }
    fetchAbortRef.current?.abort();
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    const cached = getCachedProduct(id);
    if (cached) {
      setProduct(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setProduct(null);
    }
    setNotFound(false);
    setFetchError(null);

    void (async () => {
      try {
        const data = await apiFetch<{ product: ProductSummary }>(`/api/products/${id}`, { signal: ac.signal });
        if (ac.signal.aborted) return;
        preloadLcpImage(getProductDisplayImage(data.product));
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
          setFetchError(null);
        } else if (/not found|invalid product id/i.test(msg)) {
          setProduct(null);
          setNotFound(true);
          setFetchError(null);
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
    setQty(1);
    setSelectedSize(null);
    setSizeError(null);
  }, [id]);

  const matchingBraceletIds = (product?.matchingBracelets ?? []).map((b) => b.id).join(',');
  const matchingWatchIds = (product?.matchingWatches ?? []).map((w) => w.id).join(',');

  useEffect(() => {
    if (!product) return;
    const br = product.matchingBracelets ?? [];
    if (br.length > 0) {
      setBundleBraceletId((prev) => {
        if (prev && br.some((b) => b.id === prev)) return prev;
        return br[0]?.id ?? null;
      });
    } else {
      setBundleBraceletId((prev) => (prev === null ? prev : null));
    }

    const watches = product.matchingWatches ?? [];
    if (watches.length > 0) {
      setBundleWatchId((prev) => {
        if (prev && watches.some((w) => w.id === prev)) return prev;
        return watches[0]?.id ?? null;
      });
    } else {
      setBundleWatchId((prev) => (prev === null ? prev : null));
    }
  }, [product?.id, matchingBraceletIds, matchingWatchIds]);

  if (showLoading) {
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
  const usesSizeOptions = categoryUsesSizeOptions(product.category, categories);
  const sizeOptions = usesSizeOptions ? (product.sizeOptions ?? []).filter((s) => s.trim()) : [];
  const requiresSizeSelection = sizeOptions.length > 0;

  const bracelets = product.matchingBracelets ?? [];
  const watches = product.matchingWatches ?? [];
  const comboProducts = product.comboProducts ?? [];
  const isComboProduct = comboProducts.length >= 2;
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

  const selectedWatch = watches.find((w) => w.id === bundleWatchId) ?? null;
  const reverseBundlePaiseRaw = selectedWatch?.watchBraceletBundlePrice;
  const hasReverseBundleDeal =
    reverseBundlePaiseRaw != null && reverseBundlePaiseRaw > 0 && watches.length > 0;
  const reverseBundlePaise = hasReverseBundleDeal ? reverseBundlePaiseRaw! : null;
  const showBraceletWatchPair = watches.length > 0 && selectedWatch != null;
  const reverseListPairSum =
    showBraceletWatchPair && selectedWatch ? selectedWatch.price + product.price : null;
  const reversePairChargePaise =
    showBraceletWatchPair && selectedWatch
      ? hasReverseBundleDeal && reverseBundlePaise != null
        ? reverseBundlePaise
        : reverseListPairSum!
      : null;
  const reverseBundleSave =
    hasReverseBundleDeal &&
    reverseListPairSum != null &&
    reverseBundlePaise != null &&
    reverseListPairSum > reverseBundlePaise
      ? reverseListPairSum - reverseBundlePaise
      : null;
  const reverseBundleMaxQty =
    showBraceletWatchPair && selectedWatch
      ? Math.min(product.stock || 0, selectedWatch.stock || 0)
      : 0;
  const reverseBundleCommitQty = Math.min(commitQty, Math.max(1, reverseBundleMaxQty));

  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const materialValue =
    product.jewelryDetails?.materialType ??
    (product.materials?.length ? product.materials.join(', ') : '');
  const collectionLabel = [product.category, product.subcategory].filter(Boolean).join(' · ');
  const comboMaxQty = isComboProduct
    ? Math.min(product.stock || 0, ...comboProducts.map((p) => p.stock || 0))
    : 0;
  const comboCommitQty = Math.min(commitQty, Math.max(1, comboMaxQty));
  const comboListSum = isComboProduct ? comboProducts.reduce((sum, p) => sum + p.price, 0) : 0;
  const comboSave =
    isComboProduct && comboListSum > product.price ? comboListSum - product.price : null;
  const comboAlloc = isComboProduct
    ? allocateListRatioBundle(
        comboProducts.map((p) => p.price),
        product.price,
      )
    : [];
  const inStock = isComboProduct
    ? comboMaxQty >= 1
    : (product.stock ?? 0) > 0 && product.isActive !== false;

  return (
    <Box sx={{ pb: { xs: 10, sm: 4 } }}>
      <StorefrontHeader />

      {fetchError ? (
        <Typography variant="caption" color="error" role="alert" sx={{ display: 'block', px: 2, pt: 1 }}>
          {fetchError}
        </Typography>
      ) : null}

      <ProductDetailGallery images={product.images} productName={product.name} inStock={inStock} />

      <Box sx={{ px: 2, pt: 3, maxWidth: 520, mx: 'auto' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Typography sx={{ ...pdpTypography.label, color: 'text.secondary' }}>
            {collectionLabel ? `Collection — ${collectionLabel}` : 'Collection'}
          </Typography>
          <WishlistToggleButton item={productToWishlistItem(product)} sx={{ mt: -0.5 }} />
        </Stack>

        <Typography component="h1" sx={{ ...pdpTypography.title, color: 'text.primary', mb: 1.5 }}>
          <SansDigitsText text={product.name} />
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
          {comboSave != null && comboSave > 0 ? (
            <Chip size="small" color="success" label={`Save ${formatInrFromPaise(comboSave)}`} />
          ) : null}
        </Stack>

        <ProductDescription key={product.id} description={product.description ?? ''} />

        <Stack spacing={2} sx={{ mb: 3 }}>
          <DetailRow label="Material" value={materialValue} />
          {product.watchDetails?.color ? (
            <DetailRow label="Colour" value={product.watchDetails.color} />
          ) : null}
          {!requiresSizeSelection && product.dimensions?.displayNote ? (
            <DetailRow label="Size" value={product.dimensions.displayNote} />
          ) : null}
        </Stack>

        {requiresSizeSelection ? (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ ...pdpTypography.label, color: 'text.secondary', mb: 1 }}>
              Size <Box component="span" sx={{ color: 'error.main' }}>*</Box>
            </Typography>
            <FormControl component="fieldset" variant="standard" fullWidth error={Boolean(sizeError)}>
              <RadioGroup
                value={selectedSize ?? ''}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  setSizeError(null);
                }}
              >
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {sizeOptions.map((size) => (
                    <Paper
                      key={size}
                      elevation={0}
                      sx={{
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: selectedSize === size ? 'primary.main' : 'divider',
                      }}
                    >
                      <FormControlLabel
                        value={size}
                        control={<Radio size="small" />}
                        label={size}
                        sx={{ m: 0, px: 1.25, py: 0.5 }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </RadioGroup>
              {sizeError ? (
                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                  {sizeError}
                </Typography>
              ) : null}
            </FormControl>
          </Box>
        ) : null}

        {isComboProduct && (
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
              Combo set includes
            </Typography>
            <Stack spacing={1.25}>
              {comboProducts.map((p, i) => {
                const thumb = p.images[0];
                const listPrices = comboProducts.map((row) => row.price);
                const alloc = allocateListRatioBundle(listPrices, product.price);
                return (
                  <Stack key={p.id} direction="row" spacing={1.5} alignItems="center">
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
                        List {formatInrFromPaise(p.price)} · In set {formatInrFromPaise(alloc[i] ?? 0)}
                      </Typography>
                    </Stack>
                    <Link component={RouterLink} to={`/products/${p.id}`} variant="caption">
                      Details
                    </Link>
                  </Stack>
                );
              })}
            </Stack>
          </Paper>
        )}

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

        {showBraceletWatchPair && selectedWatch && reversePairChargePaise != null && (
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
              Buy with a matching watch
            </Typography>
            <FormControl component="fieldset" variant="standard" fullWidth sx={{ mb: 1.5 }}>
              <RadioGroup
                value={bundleWatchId ?? ''}
                onChange={(e) => setBundleWatchId(e.target.value)}
              >
                {watches.map((w) => {
                  const thumb = w.images[0];
                  return (
                    <Paper
                      key={w.id}
                      elevation={0}
                      sx={{
                        mb: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: bundleWatchId === w.id ? 'primary.main' : 'divider',
                        overflow: 'hidden',
                      }}
                    >
                      <FormControlLabel
                        value={w.id}
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
                              {w.name}
                            </Typography>
                            <Link
                              component={RouterLink}
                              to={`/products/${w.id}`}
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
                {formatInrFromPaise(reversePairChargePaise)}
              </Typography>
              {reverseBundleSave != null && reverseBundleSave > 0 && (
                <Chip size="small" color="success" label={`Save ${formatInrFromPaise(reverseBundleSave)}`} />
              )}
            </Stack>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              disabled={reverseBundleMaxQty < 1}
              sx={{ ...pdpTypography.cta, py: 1.35 }}
              onClick={() => {
                const watchImg = selectedWatch.images[0];
                const alloc = allocateWatchBraceletBundle(
                  selectedWatch.price,
                  product.price,
                  reversePairChargePaise,
                );
                addBundle({
                  groupId: `watch-bracelet-${selectedWatch.id}-${product.id}`,
                  displayName: `${selectedWatch.name} + ${product.name}`,
                  unitTotalPaise: reversePairChargePaise,
                  image: watchImg ?? img,
                  components: [
                    {
                      productId: selectedWatch.id,
                      name: selectedWatch.name,
                      unitPricePaise: alloc.watchUnitPaise,
                      image: watchImg,
                    },
                    {
                      productId: product.id,
                      name: product.name,
                      unitPricePaise: alloc.braceletUnitPaise,
                      image: img,
                    },
                  ],
                  qty: reverseBundleCommitQty,
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
            {isComboProduct ? `${comboMaxQty} full sets available` : `${product.stock} in stock`}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={isComboProduct ? comboMaxQty < 1 : product.stock < 1}
          sx={{ ...pdpTypography.cta, py: 1.6, borderRadius: 0 }}
          onClick={() => {
            if (requiresSizeSelection && !selectedSize) {
              setSizeError('Please select a size');
              return;
            }
            if (isComboProduct) {
              addBundle({
                groupId: `product-combo-${product.id}`,
                displayName: product.name,
                unitTotalPaise: product.price,
                image: img,
                components: comboProducts.map((p, i) => ({
                  productId: p.id,
                  name: p.name,
                  unitPricePaise: comboAlloc[i]!,
                  image: p.images[0],
                })),
                qty: comboCommitQty,
              });
              navigate('/cart');
              return;
            }
            remove(product.id, selectedSize ?? undefined);
            add({
              productId: product.id,
              name: product.name,
              price: product.price,
              qty: commitQty,
              image: img,
              selectedSize: selectedSize ?? undefined,
            });
            navigate('/cart');
          }}
        >
          {isComboProduct ? `Add combo to bag — ${formatInrFromPaise(product.price)}` : 'Add to bag'}
        </Button>

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

      <Suspense fallback={null}>
        <ExploreCategoryRows excludeProductId={product.id} priorityCategory={product.category} />
      </Suspense>

      <Box sx={{ px: 2, maxWidth: 720, mx: 'auto' }}>
        <Suspense fallback={null}>
          <ProductReviewsSection productId={product.id} />
        </Suspense>
      </Box>
    </Box>
  );
}
