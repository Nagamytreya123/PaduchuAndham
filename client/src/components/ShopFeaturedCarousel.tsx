import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';
import { apiFetch } from '../api/client';
import { shopSurface } from '../constants/shopSurface';
import { useCategories } from '../context/CategoriesContext';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { ProductSummary } from '../types/product';
import { findCatalogCategory, type CatalogCategory } from '../utils/catalogCategory';
import { formatInrFromPaise } from '../utils/format';
import { getProductDisplayImage, handleProductImageError } from '../utils/productImage';

const AUTO_ADVANCE_MS = 4000;
const BANNER_BG = '#F8E5BF';
const BANNER_IMAGE_RADIUS = '6px';

const bannerShellSx = {
  width: '100%',
  height: '40vh',
  bgcolor: BANNER_BG,
};

type ShopFeaturedCarouselProps = {
  /** Reuse shop catalog when available to avoid a duplicate API call. */
  products?: ProductSummary[];
};

function categoryLabelFor(product: ProductSummary, categories: CatalogCategory[]): string {
  const key = product.category.trim().toLowerCase();
  return (
    categories.find((c) => c.slug.toLowerCase() === key || c.label.toLowerCase() === key)?.label ??
    product.category
  );
}

function categoryKeyFor(product: ProductSummary, categories: CatalogCategory[]): string {
  const match = findCatalogCategory(product.category, categories);
  return match?.slug.toLowerCase() ?? product.category.trim().toLowerCase();
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * One slide per category in catalog sort order (round robin).
 * Each category contributes a single randomly chosen active product.
 */
export function buildShopCarouselSlides(
  products: ProductSummary[],
  categories: CatalogCategory[],
): ProductSummary[] {
  const pool = products.filter((p) => p.isActive !== false);
  const byCategory = new Map<string, ProductSummary[]>();

  for (const product of pool) {
    const key = categoryKeyFor(product, categories);
    const group = byCategory.get(key) ?? [];
    group.push(product);
    byCategory.set(key, group);
  }

  const slides: ProductSummary[] = [];
  const seen = new Set<string>();

  const orderedCategories = [...categories]
    .filter((c) => c.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const category of orderedCategories) {
    const key = category.slug.toLowerCase();
    const group = byCategory.get(key);
    if (!group?.length) continue;
    slides.push(pickRandom(group));
    seen.add(key);
  }

  const remainingKeys = [...byCategory.keys()]
    .filter((key) => !seen.has(key))
    .sort((a, b) => a.localeCompare(b));

  for (const key of remainingKeys) {
    const group = byCategory.get(key);
    if (!group?.length) continue;
    slides.push(pickRandom(group));
  }

  return slides;
}

function discountPercent(price: number, compareAtPrice?: number): number | null {
  if (compareAtPrice == null || compareAtPrice <= price) return null;
  return Math.round((1 - price / compareAtPrice) * 100);
}

function useTabVisible() {
  const [visible, setVisible] = useState(() => !document.hidden);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return visible;
}

type CarouselSlideProps = {
  slide: ProductSummary;
  categories: CatalogCategory[];
  isActive: boolean;
  showCompare: boolean;
  discount: number | null;
};

function CarouselSlide({ slide, categories, isActive, showCompare, discount }: CarouselSlideProps) {
  return (
    <Box
      component={RouterLink}
      to={`/products/${slide.id}`}
      aria-label={`${slide.name}, ${formatInrFromPaise(slide.price)}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        bgcolor: BANNER_BG,
        px: { xs: 1.5, sm: 2 },
        pt: { xs: 1.5, sm: 1.75 },
        pb: { xs: 1.25, sm: 1.5 },
        boxSizing: 'border-box',
        textDecoration: 'none',
        color: shopSurface.ink,
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
        '&:hover': { opacity: 0.97 },
        '&:active': { opacity: 0.93 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: '1 1 auto',
          width: '100%',
          minHeight: 0,
          borderRadius: BANNER_IMAGE_RADIUS,
          overflow: 'hidden',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 4px rgba(5, 11, 24, 0.06)',
        }}
      >
        <Box
          component="img"
          src={getProductDisplayImage(slide)}
          alt=""
          loading={isActive ? 'eager' : 'lazy'}
          onError={handleProductImageError}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
        {discount != null ? (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              px: 1,
              py: 0.4,
              bgcolor: '#D6B36A',
              color: shopSurface.ink,
              ...shopSurface.pdpTypography.label,
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              lineHeight: 1.2,
            }}
          >
            {discount}% off
          </Box>
        ) : null}
      </Box>

      <Box
        sx={{
          flex: '0 0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          pt: { xs: 0.85, sm: 1 },
          gap: 0.3,
        }}
      >
        <Typography
          sx={{
            ...shopSurface.pdpTypography.label,
            color: shopSurface.badge,
            fontSize: '0.6rem',
            lineHeight: 1.2,
          }}
        >
          {categoryLabelFor(slide, categories)}
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontFamily: shopSurface.font.display,
            fontWeight: 500,
            fontSize: { xs: '1.05rem', sm: '1.2rem' },
            lineHeight: 1.2,
            color: shopSurface.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {slide.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mt: 0.1 }}>
          <Typography
            sx={{
              ...shopSurface.amountLg,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              color: shopSurface.ink,
              lineHeight: 1.2,
            }}
          >
            {formatInrFromPaise(slide.price)}
          </Typography>
          {showCompare ? (
            <Typography
              sx={{
                fontFamily: shopSurface.font.body,
                fontSize: '0.85rem',
                color: shopSurface.inkMuted,
                textDecoration: 'line-through',
                lineHeight: 1.2,
              }}
            >
              {formatInrFromPaise(slide.compareAtPrice!)}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

export function ShopFeaturedCarousel({ products: externalProducts }: ShopFeaturedCarouselProps) {
  const { categories, catalogRevision } = useCategories();
  const reduced = useReducedMotion();
  const { ref: viewportRef, inView } = useInView({ threshold: 0.2 });
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const tabVisible = useTabVisible();
  const isActive = inView && tabVisible;

  const [slides, setSlides] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);

  useEffect(() => {
    setSlides([]);
    setIndex(0);
  }, [catalogRevision]);

  useEffect(() => {
    if (!isActive) return;

    if (externalProducts != null) {
      setSlides(buildShopCarouselSlides(externalProducts, categories));
      setIndex(0);
      setLoading(false);
      return;
    }

    if (slides.length > 0) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        if (cancelled) return;
        setSlides(buildShopCarouselSlides(data.products, categories));
        setIndex(0);
      } catch {
        if (!cancelled) setSlides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, externalProducts, categories, catalogRevision, slides.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const measure = () => setSlideWidth(el.clientWidth);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [slides.length]);

  useEffect(() => {
    if (!skipTransition) return;
    const id = requestAnimationFrame(() => setSkipTransition(false));
    return () => cancelAnimationFrame(id);
  }, [skipTransition, index]);

  useEffect(() => {
    if (!isActive || slides.length <= 1 || paused || reduced) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % slides.length;
        if (next === 0 && current === slides.length - 1) {
          setSkipTransition(true);
        }
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isActive, slides.length, paused, reduced]);

  const transition = useMemo(
    () => ({
      type: 'tween' as const,
      duration: skipTransition ? 0 : reduced ? 0.15 : 0.65,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    }),
    [reduced, skipTransition],
  );

  const showLoading = isActive && loading && slides.length === 0;

  return (
    <Box
      ref={viewportRef}
      component="section"
      aria-label="Featured products"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      sx={{
        ...bannerShellSx,
        position: 'relative',
        overflow: 'hidden',
        color: shopSurface.ink,
        display: showLoading ? 'flex' : 'block',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showLoading ? (
        <Typography sx={{ ...shopSurface.pdpTypography.label, color: shopSurface.inkMuted }}>
          Loading highlights…
        </Typography>
      ) : null}

      {slides.length > 0 ? (
        <Box
          ref={trackRef}
          sx={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            bgcolor: BANNER_BG,
          }}
        >
          <motion.div
            animate={{ x: slideWidth > 0 ? -index * slideWidth : 0 }}
            transition={transition}
            style={{
              display: 'flex',
              height: '100%',
              willChange: 'transform',
              backgroundColor: BANNER_BG,
            }}
          >
            {slides.map((item, slideIndex) => {
              const itemCompare =
                item.compareAtPrice != null && item.compareAtPrice > item.price;
              const itemDiscount = discountPercent(item.price, item.compareAtPrice);
              return (
                <Box
                  key={item.id}
                  sx={{
                    width: slideWidth > 0 ? slideWidth : '100%',
                    flexShrink: 0,
                    height: '100%',
                    bgcolor: BANNER_BG,
                  }}
                >
                  <CarouselSlide
                    slide={item}
                    categories={categories}
                    isActive={isActive && slideIndex === index}
                    showCompare={itemCompare}
                    discount={itemDiscount}
                  />
                </Box>
              );
            })}
          </motion.div>
        </Box>
      ) : null}

      {slides.length > 1 ? (
        <Box
          sx={{
            position: 'absolute',
            bottom: { xs: 62, sm: 66 },
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 0.5,
            pointerEvents: 'auto',
            zIndex: 2,
          }}
        >
          {slides.map((item, dotIndex) => {
            const active = dotIndex === index;
            return (
              <Box
                key={item.id}
                component="button"
                type="button"
                aria-label={`Show ${item.name}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => setIndex(dotIndex)}
                sx={{
                  width: active ? 20 : 6,
                  height: 6,
                  border: 'none',
                  borderRadius: 99,
                  p: 0,
                  cursor: 'pointer',
                  bgcolor: active ? shopSurface.bandBottom : 'rgba(5, 11, 24, 0.22)',
                  transition: 'width 0.3s ease, background-color 0.3s ease',
                }}
              />
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
