import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Skeleton,
  Button,
  Stack,
  Container,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardActionArea,
} from '@mui/material';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import Lenis from 'lenis';
import { apiFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { JewelleryComboStorefrontCard } from '../components/JewelleryComboStorefrontCard';
import type { ProductSummary } from '../types/product';
import type { JewelleryComboSummary } from '../types/jewelleryCombo';
import {
  STOREFRONT_COLLECTION_FILTERS,
  filterKeyToApiCategory,
  searchParamToFilterKey,
  type StorefrontCollectionFilterKey,
} from '../constants/collectionCategoryFilters';
import {
  orderedJewellerySubtypeOptions,
  parseJewellerySubcategoryForApi,
  type JewellerySubFilterKey,
  type JewellerySubcategoryPreset,
} from '../constants/jewellerySubcategories';
import {
  BRACELET_CATEGORY_TILE_IMAGE,
  COMBO_CATEGORY_TILE_IMAGE,
  JEWELLERY_CATEGORY_TILE_IMAGES,
  WATCH_CATEGORY_TILE_IMAGE,
} from '../constants/categoryTileImages';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/productImage';
import { shopSurface } from '../constants/shopSurface';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { EditorialImageFrame } from '../components/EditorialImageFrame';
import { editorialFrameSx } from '../constants/shopSurface';

const TOTAL_FRAMES = 240;

/** Jewellery subtype tiles — order matches common storefront hierarchy (necklaces & earrings first). */
const HOME_JEWELLERY_CATEGORY_ORDER: JewellerySubcategoryPreset[] = [
  'Necklaces',
  'Earrings',
  'Bangles',
  'Rings',
  'Chains',
];

const FALLBACK_FRAME_STEP = 37;

function categoryTileSrc(
  tile: { key: string; label: string; image?: string },
  index: number,
): string {
  if (tile.key.startsWith('jewellery-')) {
    const sub = tile.label as JewellerySubcategoryPreset;
    return JEWELLERY_CATEGORY_TILE_IMAGES[sub] ?? tile.image ?? PRODUCT_IMAGE_FALLBACK;
  }
  if (tile.key === 'watches') return WATCH_CATEGORY_TILE_IMAGE;
  if (tile.key === 'bracelets') return BRACELET_CATEGORY_TILE_IMAGE;
  if (tile.key === 'combos') return tile.image ?? COMBO_CATEGORY_TILE_IMAGE;
  const fallbackFrame = (((index * FALLBACK_FRAME_STEP) % TOTAL_FRAMES) + 1).toString().padStart(4, '0');
  return tile.image ?? `/frames/frame_${fallbackFrame}.webp`;
}

function ShopByCategoriesSection({
  combos,
  combosLoading,
}: {
  combos: JewelleryComboSummary[];
  combosLoading: boolean;
}) {
  const showCombosTile = combosLoading || combos.length > 0;

  const tiles = useMemo(() => {
    const rows: { key: string; label: string; search: string; image?: string }[] = [];
    for (const sub of HOME_JEWELLERY_CATEGORY_ORDER) {
      rows.push({
        key: `jewellery-${sub}`,
        label: sub,
        search: `?category=Jewellery&subcategory=${encodeURIComponent(sub)}`,
      });
    }
    rows.push(
      { key: 'watches', label: 'Watches', search: '?category=Watches' },
      { key: 'bracelets', label: 'Bracelets', search: '?category=Bracelets' },
    );
    if (showCombosTile) {
      rows.push({
        key: 'combos',
        label: 'Curated sets',
        search: '?category=combos',
        image: combos[0]?.images[0],
      });
    }
    return rows;
  }, [showCombosTile, combos]);

  return (
    <Box
      id="shop"
      component="section"
      sx={{
        py: { xs: 6, md: 9 },
        px: { xs: 2, md: 4 },
        bgcolor: shopSurface.creamDeep,
        position: 'relative',
        zIndex: 10,
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mb: { xs: 3, md: 4 } }}>
          <Typography
            component="h2"
            sx={{
              color: shopSurface.ink,
              fontFamily: shopSurface.font.display,
              fontWeight: 500,
              letterSpacing: '0.14em',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              textTransform: 'uppercase',
              mb: 1,
            }}
          >
            Shop by categories
          </Typography>
          <Typography
            sx={{
              color: shopSurface.inkMuted,
              fontFamily: shopSurface.font.display,
              fontStyle: 'italic',
              fontSize: { xs: '1.15rem', sm: '1.35rem' },
              fontWeight: 400,
            }}
          >
            Find your perfect match
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          {tiles.map((tile, index) => {
            const src = categoryTileSrc(tile, index);
            const showSkeleton = tile.key === 'combos' && combosLoading;

            return (
              <Grid item xs={12} sm={6} md={4} key={tile.key}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 0,
                      overflow: 'visible',
                      bgcolor: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                    }}
                  >
                    <CardActionArea
                      component={RouterLink}
                      to={{ pathname: '/', search: tile.search, hash: 'collection' }}
                      sx={{ display: 'block' }}
                    >
                      {showSkeleton ? (
                        <Skeleton
                          variant="rectangular"
                          sx={{ ...editorialFrameSx.root, ...editorialFrameSx.inset }}
                        />
                      ) : (
                        <EditorialImageFrame src={src} alt={tile.label} inset />
                      )}
                      <Typography
                        sx={{
                          py: 1.5,
                          px: 1,
                          textAlign: 'center',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          fontSize: { xs: '0.68rem', sm: '0.72rem' },
                          color: shopSurface.ink,
                          textTransform: 'uppercase',
                          lineHeight: 1.3,
                        }}
                      >
                        {tile.label}
                      </Typography>
                    </CardActionArea>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

function FrameSequence({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  
  // Preload frames
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;
    
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(4, '0');
      img.src = `/frames/frame_${frameNum}.webp`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === TOTAL_FRAMES) {
          setImages(loadedImages);
        }
      };
      loadedImages.push(img);
    }
  }, []);

  // Use spring for smoother frame interpolation
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const frameIndex = useTransform(smoothProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  useEffect(() => {
    if (!canvasRef.current || images.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Initial draw
    ctx.drawImage(images[0], 0, 0, canvasRef.current.width, canvasRef.current.height);

    const unsubscribe = frameIndex.on("change", (latest) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const index = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(latest)));
      const img = images[index];
      if (img && img.complete) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    });

    return () => unsubscribe();
  }, [frameIndex, images]);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 0,
        bgcolor: '#0F0F10',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={{
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
            filter: 'brightness(0.85)',
          }}
        />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(to bottom, rgba(15, 15, 16, 0.15) 0%, rgba(15, 15, 16, 0.45) 50%, rgba(15, 15, 16, 0.65) 100%)',
        }}
      />
    </Box>
  );
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const categoryParam = searchParams.get('category') ?? '';
  const subcategoryParam = searchParams.get('subcategory') ?? '';
  const activeFilterKey = searchParamToFilterKey(categoryParam);
  const apiCategory = filterKeyToApiCategory(activeFilterKey);
  const showComboFilterView = activeFilterKey === 'Combos';
  const showJewelleryTypeFilter = activeFilterKey === 'Jewellery';
  const jewellerySubForApi = showJewelleryTypeFilter
    ? parseJewellerySubcategoryForApi(subcategoryParam)
    : '';
  const jewellerySubToggle: JewellerySubFilterKey = jewellerySubForApi || 'all';

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [catalogJewellerySubcategories, setCatalogJewellerySubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jewellerySubtypeFilterRowOptions = useMemo(
    () =>
      orderedJewellerySubtypeOptions(
        [...catalogJewellerySubcategories, jewellerySubForApi].filter(Boolean),
      ),
    [catalogJewellerySubcategories, jewellerySubForApi],
  );

  const [combos, setCombos] = useState<JewelleryComboSummary[]>([]);
  const [combosLoading, setCombosLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const collectionNavRef = useRef({ hash: '', search: '' });
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  /** After category tiles set `?…#collection`, scroll there and move keyboard focus (RR does not do this reliably). */
  useLayoutEffect(() => {
    const searchStr = searchParams.toString();
    const h = location.hash;
    const prev = collectionNavRef.current;
    if (h !== '#collection') {
      collectionNavRef.current = { hash: h, search: searchStr };
      return;
    }
    const hashJustSet = prev.hash !== '#collection';
    const queryChanged = prev.search !== searchStr;
    collectionNavRef.current = { hash: h, search: searchStr };
    if (!hashJustSet && !queryChanged) return;

    requestAnimationFrame(() => {
      const el = document.getElementById('collection');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (el instanceof HTMLElement) {
        el.focus({ preventScroll: true });
      }
    });
  }, [location.hash, location.pathname, searchParams]);

  // Lenis smooth scrolling setup
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ combos: JewelleryComboSummary[] }>('/api/jewellery-combos');
        setCombos(data.combos);
      } catch {
        setCombos([]);
      } finally {
        setCombosLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showJewelleryTypeFilter || !apiCategory) {
      setCatalogJewellerySubcategories([]);
      return;
    }
    const params = new URLSearchParams();
    params.set('category', apiCategory);
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products?${params}`);
        const subs = data.products
          .map((p) => (p.subcategory ?? '').trim())
          .filter(Boolean);
        setCatalogJewellerySubcategories(subs);
      } catch {
        setCatalogJewellerySubcategories([]);
      }
    })();
  }, [showJewelleryTypeFilter, apiCategory]);

  // Fetch products (skipped when viewing Combos — those load from `/api/jewellery-combos` above)
  useEffect(() => {
    if (showComboFilterView) {
      setProducts([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiCategory) params.set('category', apiCategory);
    if (jewellerySubForApi) params.set('subcategory', jewellerySubForApi);
    const q = params.toString() ? `?${params}` : '';
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products${q}`);
        setProducts(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCategory, jewellerySubForApi, showComboFilterView]);

  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <Box sx={{ backgroundColor: '#0F0F10', minHeight: '100vh', color: '#F5F5F5' }}>
      <StorefrontHeader />
      {/* Scroll Sequence Container */}
      <Box ref={containerRef} sx={{ height: '400vh', position: 'relative', isolation: 'isolate' }}>
        <FrameSequence scrollYProgress={scrollYProgress} />

        {/* Cinematic Hero Text */}
        <Box
          component={motion.div}
          style={{ y: textY, opacity: textOpacity }}
          sx={{
            position: 'absolute',
            top: '40vh',
            left: 0,
            right: 0,
            width: '100%',
            textAlign: 'center',
            px: 2,
            zIndex: 2,
            pointerEvents: 'none',
            '& .MuiButton-root': { pointerEvents: 'auto' },
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <Typography
              variant="h1"
              gutterBottom
              sx={{
                fontFamily: shopSurface.font.display,
                fontWeight: 400,
                color: shopSurface.cream,
                letterSpacing: '0.02em',
              }}
            >
              Timeless Elegance
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mb: 4,
                fontFamily: shopSurface.font.display,
                fontWeight: 400,
                fontStyle: 'italic',
                color: 'rgba(242, 238, 230, 0.88)',
              }}
            >
              Crafted for Every Moment
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              size="large"
              sx={{ 
                border: '1px solid #D6B36A',
                background: 'transparent',
                color: '#D6B36A',
                '&:hover': {
                  background: 'rgba(214, 179, 106, 0.1)',
                }
              }}
              onClick={() => {
                document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore categories
            </Button>
          </motion.div>
        </Box>
      </Box>

      {/* Brand Story Section */}
      <Box sx={{ py: 15, px: { xs: 2, md: 8 }, background: '#0F0F10', position: 'relative', zIndex: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <Typography
                  variant="h2"
                  sx={{ mb: 3, fontFamily: shopSurface.font.display, fontWeight: 500, color: shopSurface.cream }}
                >
                  Designed to elevate modern femininity.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontFamily: shopSurface.font.body,
                    color: 'rgba(242, 238, 230, 0.65)',
                    fontSize: '1.1rem',
                    mb: 4,
                    maxWidth: 480,
                  }}
                >
                  Each piece is meticulously crafted using only the finest materials. We blend classic techniques with contemporary design to create accessories that are not just worn, but experienced.
                </Typography>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    filter: 'grayscale(20%) contrast(110%)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                  }}
                >
                  <EditorialImageFrame src="/frames/frame_0150.webp" alt="Brand aesthetics" inset />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <ShopByCategoriesSection combos={combos} combosLoading={combosLoading} />

      {/* Featured Collection Section */}
      <Box
        id="collection"
        component="section"
        tabIndex={-1}
        aria-label="The collection"
        sx={{
          py: 15,
          px: { xs: 2, md: 4 },
          background: '#141415',
          position: 'relative',
          zIndex: 10,
          outline: 'none',
          '&:focus-visible': {
            outline: '2px solid #D6B36A',
            outlineOffset: 4,
          },
        }}
      >
        <Container maxWidth="xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Typography variant="h2" align="center" sx={{ mb: 1, color: '#D6B36A' }}>
              The Collection
            </Typography>
            <Typography variant="subtitle1" align="center" sx={{ mb: 3, color: '#8A8175', maxWidth: 640, mx: 'auto' }}>
              {showComboFilterView
                ? 'Curated jewellery sets at a fixed bundle price'
                : 'Browse the full catalogue — tap a category above or use the filters below.'}
            </Typography>
            <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ mb: 6, gap: 1 }}>
              <ToggleButtonGroup
                exclusive
                value={activeFilterKey}
                onChange={(_e, key: StorefrontCollectionFilterKey | null) => {
                  if (key == null) return;
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      if (key === 'all') next.delete('category');
                      else if (key === 'Combos') next.set('category', 'combos');
                      else next.set('category', filterKeyToApiCategory(key));
                      if (key !== 'Jewellery') next.delete('subcategory');
                      return next;
                    },
                    { replace: true },
                  );
                }}
                aria-label="Filter by category"
                sx={{
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  '& .MuiToggleButton-root': {
                    color: '#8A8175',
                    borderColor: 'rgba(214, 179, 106, 0.35)',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                  },
                  '& .MuiToggleButton-root.Mui-selected': {
                    color: '#0F0F10',
                    bgcolor: '#D6B36A',
                    borderColor: '#D6B36A',
                    '&:hover': { bgcolor: '#c4a055' },
                  },
                }}
              >
                {STOREFRONT_COLLECTION_FILTERS.map((opt) => (
                  <ToggleButton key={opt.key} value={opt.key}>
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            {showJewelleryTypeFilter && (
              <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ mb: 6, gap: 1 }}>
                <ToggleButtonGroup
                  exclusive
                  value={jewellerySubToggle}
                  onChange={(_e, subKey: JewellerySubFilterKey | null) => {
                    if (subKey == null) return;
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        if (subKey === 'all') next.delete('subcategory');
                        else next.set('subcategory', subKey);
                        return next;
                      },
                      { replace: true },
                    );
                  }}
                  aria-label="Filter jewellery by type"
                  sx={{
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    '& .MuiToggleButton-root': {
                      color: '#8A8175',
                      borderColor: 'rgba(214, 179, 106, 0.25)',
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 1.5,
                      py: 0.5,
                      fontSize: '0.85rem',
                    },
                    '& .MuiToggleButton-root.Mui-selected': {
                      color: '#0F0F10',
                      bgcolor: 'rgba(214, 179, 106, 0.85)',
                      borderColor: 'rgba(214, 179, 106, 0.85)',
                      '&:hover': { bgcolor: 'rgba(196, 160, 85, 0.95)' },
                    },
                  }}
                >
                  <ToggleButton value="all">All types</ToggleButton>
                  {jewellerySubtypeFilterRowOptions.map((label) => (
                    <ToggleButton key={label} value={label}>
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            )}
          </motion.div>

          {showComboFilterView ? (
            combosLoading ? (
              <Grid container spacing={4}>
                {[1, 2, 3, 4].map((k) => (
                  <Grid item xs={12} sm={6} md={4} key={k}>
                    <Skeleton
                      variant="rectangular"
                      sx={{ width: '92%', mx: 'auto', aspectRatio: '4 / 5', bgcolor: 'rgba(255,255,255,0.05)' }}
                    />
                    <Skeleton width="60%" sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                    <Skeleton width="40%" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
                  </Grid>
                ))}
              </Grid>
            ) : combos.length === 0 ? (
              <Typography color="text.secondary" align="center">
                No jewellery sets available yet.
              </Typography>
            ) : (
              <Grid container spacing={4}>
                {combos.map((c, index) => (
                  <JewelleryComboStorefrontCard key={c.id} combo={c} index={index} imageFrame="editorial" />
                ))}
              </Grid>
            )
          ) : loading ? (
            <Grid container spacing={4}>
              {[1, 2, 3, 4].map((k) => (
                <Grid item xs={12} sm={6} md={4} key={k}>
                  <Skeleton
                    variant="rectangular"
                    sx={{ width: '92%', mx: 'auto', aspectRatio: '4 / 5', bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                  <Skeleton width="60%" sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                  <Skeleton width="40%" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Grid>
              ))}
            </Grid>
          ) : error ? (
            <Typography color="error" align="center">{error}</Typography>
          ) : products.length === 0 ? (
            <Typography color="text.secondary" align="center">No products found.</Typography>
          ) : (
            <Grid container spacing={4}>
              {products.map((p, index) => (
                <Grid item xs={12} sm={6} md={4} key={p.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <Box sx={{ 
                      transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                      '&:hover': {
                        transform: 'translateY(-10px)',
                        boxShadow: '0 15px 30px rgba(214, 179, 106, 0.1)'
                      }
                    }}>
                      <ProductCard product={p} imageFrame="editorial" />
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 8, px: { xs: 2, md: 8 }, background: '#0A0A0A', borderTop: '1px solid rgba(214, 179, 106, 0.1)', position: 'relative', zIndex: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="space-between">
            <Grid item xs={12} md={4}>
              <Typography
                sx={{
                  ...shopSurface.logo,
                  fontSize: { xs: '0.75rem', md: '0.85rem' },
                  color: shopSurface.cream,
                  mb: 2,
                }}
              >
                Paduchuandham
              </Typography>
              <Typography variant="body2" sx={{ color: '#8A8175' }}>
                Crafting timeless elegance for the modern woman. Discover our exclusive collection of luxury accessories.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: '#F5F5F5', mb: 2 }}>Collections</Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Watches</Typography>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Bracelets</Typography>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Gift Sets</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="subtitle2" sx={{ color: '#F5F5F5', mb: 2 }}>Support</Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Contact Us</Typography>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Shipping & Returns</Typography>
                <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Care Guide</Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" sx={{ color: '#F5F5F5', mb: 2 }}>Newsletter</Typography>
              <Typography variant="body2" sx={{ color: '#8A8175', mb: 2 }}>
                Subscribe to receive updates, access to exclusive deals, and more.
              </Typography>
              {/* Simple pseudo input */}
              <Box sx={{ display: 'flex', borderBottom: '1px solid #8A8175', pb: 1 }}>
                <Box component="input" placeholder="Enter your email" sx={{ background: 'transparent', border: 'none', color: '#F5F5F5', outline: 'none', flexGrow: 1, '&::placeholder': { color: '#8A8175' } }} />
                <Typography sx={{ color: '#D6B36A', cursor: 'pointer', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscribe</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid rgba(138, 129, 117, 0.2)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: '#8A8175' }}>
              © 2026 Paduchuandham. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={3}>
              <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Instagram</Typography>
              <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Facebook</Typography>
              <Typography variant="body2" sx={{ color: '#8A8175', cursor: 'pointer', '&:hover': { color: '#D6B36A' } }}>Pinterest</Typography>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
