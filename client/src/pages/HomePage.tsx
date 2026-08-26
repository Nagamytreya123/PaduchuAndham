import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  Container,
  Card,
  CardActionArea,
} from '@mui/material';
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion';
import Lenis from 'lenis';
import { apiFetch } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import type { ProductSummary } from '../types/product';
import {
  apiCategoryForFilter,
  parseCollectionFilterParam,
  priceFiltersForSelection,
  productMatchesPriceFilter,
  resolvePriceFilterParam,
  resolveSubcategoryParam,
  subcategoriesForFilter,
} from '../utils/catalogCategory';
import { PRODUCT_IMAGE_FALLBACK } from '../utils/productImage';
import { LuxuryShowcaseLoader } from '../components/loading';
import { seedCatalog } from '../utils/catalogCache';
import { shopSurface } from '../constants/shopSurface';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { EditorialImageFrame } from '../components/EditorialImageFrame';
import { CategoryFilterGroup } from '../components/CategoryFilterGroup';
import { SubcategoryFilterGroup } from '../components/SubcategoryFilterGroup';
import { PriceFilterGroup } from '../components/PriceFilterGroup';
import { useCategories } from '../context/CategoriesContext';

const TOTAL_FRAMES = 240;

function categoryTileSrc(tile: { image?: string }): string {
  return tile.image || PRODUCT_IMAGE_FALLBACK;
}

function ShopByCategoriesSection() {
  const { categories } = useCategories();

  const tiles = useMemo(() => {
    return categories.map((c) => ({
      key: c.slug,
      label: c.label,
      search: `?category=${encodeURIComponent(c.slug)}`,
      image: c.tileImageUrl || PRODUCT_IMAGE_FALLBACK,
    }));
  }, [categories]);

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
            const src = categoryTileSrc(tile);

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
                      <EditorialImageFrame src={src} alt={tile.label} inset />
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
  const { categories, catalogRevision } = useCategories();
  const categoryParam = searchParams.get('category') ?? '';
  const subcategoryParam = searchParams.get('subcategory') ?? '';
  const priceFilterParam = searchParams.get('priceFilter') ?? '';
  const activeFilterKey = parseCollectionFilterParam(categoryParam, categories);
  const apiCategory = apiCategoryForFilter(activeFilterKey);
  const subcategoryOptions = subcategoriesForFilter(categories, activeFilterKey);
  const apiSubcategory = resolveSubcategoryParam(subcategoryParam, subcategoryOptions);
  const priceFilterOptions = priceFiltersForSelection(categories, activeFilterKey, apiSubcategory);
  const activePriceFilter = resolvePriceFilterParam(priceFilterParam, priceFilterOptions);

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeScrollAnimationEnabled, setHomeScrollAnimationEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const collectionNavRef = useRef({ hash: '', search: '' });
  const { scrollYProgress } = useScroll({
    target: homeScrollAnimationEnabled ? containerRef : undefined,
    offset: ['start start', 'end end'],
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

  // Lenis smooth scrolling — only when the scroll animation hero is enabled
  useEffect(() => {
    if (!homeScrollAnimationEnabled) return;

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
  }, [homeScrollAnimationEnabled]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ settings: { homeScrollAnimationEnabled: boolean } }>(
          '/api/site-settings',
        );
        setHomeScrollAnimationEnabled(data.settings.homeScrollAnimationEnabled);
      } catch {
        setHomeScrollAnimationEnabled(false);
      } finally {
        setSettingsLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiCategory) params.set('category', apiCategory);
    if (apiSubcategory) params.set('subcategory', apiSubcategory);
    const q = params.toString() ? `?${params}` : '';
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>(`/api/products${q}`);
        setProducts(data.products);
        seedCatalog(data.products);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiCategory, apiSubcategory, catalogRevision]);

  const visibleProducts = useMemo(
    () => products.filter((p) => productMatchesPriceFilter(p.price, activePriceFilter)),
    [products, activePriceFilter],
  );

  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  if (!settingsLoaded) {
    return <LuxuryShowcaseLoader variant="fullscreen" tone="dark" aria-label="Loading home page" />;
  }

  return (
    <Box
      sx={{
        backgroundColor: homeScrollAnimationEnabled ? '#0F0F10' : shopSurface.creamDeep,
        minHeight: '100vh',
        color: homeScrollAnimationEnabled ? '#F5F5F5' : shopSurface.ink,
      }}
    >
      <StorefrontHeader />
      {homeScrollAnimationEnabled ? (
        <>
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
                transition={{ duration: 1.5, ease: 'easeOut' }}
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
                    },
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
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
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
                      Each piece is meticulously crafted using only the finest materials. We blend classic techniques
                      with contemporary design to create accessories that are not just worn, but experienced.
                    </Typography>
                  </motion.div>
                </Grid>
                <Grid item xs={12} md={6}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
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
        </>
      ) : null}

      <ShopByCategoriesSection />

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
              Browse the full catalogue — tap a category above or use the filters below.
            </Typography>
            <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ mb: 6, gap: 1 }}>
              <CategoryFilterGroup
                categories={categories}
                value={activeFilterKey}
                ariaLabel="Filter by category"
                onChange={(key) => {
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      if (key === 'all') next.delete('category');
                      else next.set('category', key);
                      next.delete('subcategory');
                      next.delete('priceFilter');
                      return next;
                    },
                    { replace: true },
                  );
                }}
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
              />
            </Stack>
            {subcategoryOptions.length > 0 && (
              <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ mb: 6, gap: 1 }}>
                <SubcategoryFilterGroup
                  subcategories={subcategoryOptions}
                  value={apiSubcategory}
                  onChange={(sub) => {
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        if (!sub) next.delete('subcategory');
                        else next.set('subcategory', sub);
                        next.delete('priceFilter');
                        return next;
                      },
                      { replace: true },
                    );
                  }}
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
                />
              </Stack>
            )}
            {priceFilterOptions.length > 0 && (
              <Stack direction="row" justifyContent="center" flexWrap="wrap" sx={{ mb: 6, gap: 1 }}>
                <PriceFilterGroup
                  filters={priceFilterOptions}
                  value={activePriceFilter?.id ?? ''}
                  onChange={(id) => {
                    setSearchParams(
                      (prev) => {
                        const next = new URLSearchParams(prev);
                        if (!id) next.delete('priceFilter');
                        else next.set('priceFilter', id);
                        return next;
                      },
                      { replace: true },
                    );
                  }}
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
                />
              </Stack>
            )}
          </motion.div>

          {loading ? (
            <LuxuryShowcaseLoader variant="inline" tone="dark" aria-label="Loading collection" />
          ) : error ? (
            <Typography color="error" align="center">{error}</Typography>
          ) : visibleProducts.length === 0 ? (
            <Typography color="text.secondary" align="center">No products found.</Typography>
          ) : (
            <Grid container spacing={4}>
              {visibleProducts.map((p, index) => (
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
                {categories.map((c) => (
                  <Typography
                    key={c.slug}
                    component={RouterLink}
                    to={{ pathname: '/', search: `?category=${encodeURIComponent(c.slug)}`, hash: 'collection' }}
                    variant="body2"
                    sx={{ color: '#8A8175', cursor: 'pointer', textDecoration: 'none', '&:hover': { color: '#D6B36A' } }}
                  >
                    {c.label}
                  </Typography>
                ))}
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
