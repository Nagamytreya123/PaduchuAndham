import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '../../api/client';
import { shopSurface } from '../../constants/shopSurface';
import { useCategories } from '../../context/CategoriesContext';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ProductSummary } from '../../types/product';
import { sortProductsByCreatedDesc } from '../../utils/productSort';
import { getProductDisplayImage, handleProductImageError } from '../../utils/productImage';
import { BrandFillLoader } from '../loading';
import { SansDigitsText } from '../SansDigitsText';
import { useMinimumLoading } from '../../hooks/useMinimumLoading';
import { IconChevronLeft, IconChevronRight } from '../../icons';

const SECTION_BG = '#12100e';
const ACCENT = '#c9b89a';
const ACCENT_CTA = '#c4a574';

function BestSellersHeading({ compact }: { compact: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? { xs: 1.25, sm: 1.75 } : { xs: 1.75, sm: 2.5 },
        mb: compact ? { xs: 1.25, sm: 1.5 } : { xs: 3.5, md: 4.5 },
        flexShrink: 0,
        px: compact ? { xs: 2.5, sm: 3.5 } : { xs: 2, sm: 3 },
        width: '100%',
      }}
    >
      <Box
        aria-hidden
        sx={{
          flex: 1,
          height: '1px',
          bgcolor: ACCENT,
        }}
      />
      <Typography
        component="h2"
        sx={{
          fontFamily: shopSurface.font.display,
          fontWeight: 500,
          fontSize: compact
            ? { xs: '0.95rem', sm: '1.05rem' }
            : { xs: '1.05rem', sm: '1.2rem' },
          letterSpacing: compact ? '0.22em' : { xs: '0.24em', sm: '0.3em' },
          textTransform: 'uppercase',
          color: ACCENT,
          whiteSpace: 'nowrap',
          lineHeight: 1.15,
        }}
      >
        Best Sellers
      </Typography>
      <Box
        aria-hidden
        sx={{
          flex: 1,
          height: '1px',
          bgcolor: ACCENT,
        }}
      />
    </Box>
  );
}
const AUTO_ADVANCE_MS = 3000;
const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD_PX = 24;
const SHOP_BANNER_HEIGHT = '40vh';

function categoryLabel(product: ProductSummary, labelFor: (slug: string) => string): string {
  return labelFor(product.category) || product.category;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/** Rounded percent saved when compare-at exceeds sale price (paise). */
function discountPercentOff(pricePaise: number, compareAtPaise?: number): number | null {
  if (compareAtPaise == null || compareAtPaise <= pricePaise) return null;
  const pct = Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
  return pct > 0 ? pct : null;
}

type BestSellersShowcaseProps = {
  /** Reuse shop catalog when available to avoid a duplicate API call. */
  products?: ProductSummary[];
  /** `shop` = compact 40vh banner; `landing` = full marketing section. */
  variant?: 'landing' | 'shop';
};

type SlideCardProps = {
  product: ProductSummary;
  category: string;
  isActive: boolean;
  position: 'left' | 'center' | 'right' | 'hidden';
  reduced: boolean;
  direction: number;
  compact: boolean;
  isMobile: boolean;
};

function slideX(position: 'left' | 'center' | 'right' | 'hidden', peekOffset: number): string {
  if (position === 'left') return `calc(-50% - ${peekOffset}%)`;
  if (position === 'right') return `calc(-50% + ${peekOffset}%)`;
  return '-50%';
}

function SlideCard({
  product,
  category,
  isActive,
  position,
  reduced,
  direction,
  compact,
  isMobile,
}: SlideCardProps) {
  const image = getProductDisplayImage(product);
  const discountPercent = discountPercentOff(product.price, product.compareAtPrice);
  const hidden = position === 'hidden';
  const peekOffset = compact ? (isMobile ? 40 : 50) : 52;
  const cardWidth = compact
    ? isMobile
      ? 'min(66vw, 400px)'
      : 'min(74vw, 500px)'
    : 'min(88vw, 640px)';
  const cardMaxWidth = compact ? (isMobile ? 400 : 500) : 640;
  const xPosition = slideX(position, peekOffset);

  const cardStyle = {
    position: 'absolute' as const,
    left: '50%',
    top: 0,
    width: cardWidth,
    maxWidth: cardMaxWidth,
    height: compact ? '100%' : 'clamp(380px, 52vh, 480px)',
    borderRadius: isMobile && compact ? 12 : 16,
    overflow: 'hidden' as const,
    pointerEvents: (isActive ? 'auto' : 'none') as 'auto' | 'none',
    boxShadow: isActive ? '0 28px 64px rgba(0, 0, 0, 0.55)' : '0 12px 32px rgba(0, 0, 0, 0.35)',
    transform: `translateX(${xPosition})`,
  };

  const cardInner = (
    <>
      <Box
        component="img"
        src={image}
        alt={product.name}
        loading={isActive ? 'eager' : 'lazy'}
        onError={handleProductImageError}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(15,15,16,0.05) 0%, rgba(15,15,16,0.35) 45%, rgba(15,15,16,0.92) 100%)',
        }}
      />

      {discountPercent != null ? (
        <Box
          sx={{
            position: 'absolute',
            top: compact ? 10 : { xs: 12, sm: 14 },
            left: compact ? 10 : { xs: 12, sm: 14 },
            zIndex: 2,
            px: compact ? 1 : 1.25,
            py: compact ? 0.35 : 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(196, 165, 116, 0.95)',
            color: '#1a1410',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: shopSurface.font.body,
              fontWeight: 700,
              fontSize: compact ? '0.62rem' : { xs: '0.68rem', sm: '0.74rem' },
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            {discountPercent}% off
          </Typography>
        </Box>
      ) : null}

      {isActive ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            px: compact ? 1.5 : { xs: 2, sm: 3 },
            pb: compact ? 1.5 : { xs: 2.5, sm: 3 },
            color: '#fff',
          }}
        >
          <Typography
            sx={{
              fontFamily: shopSurface.font.display,
              fontWeight: 600,
              fontSize: compact
                ? { xs: '1rem', sm: '1.15rem' }
                : { xs: '1.35rem', sm: '1.65rem', md: '1.85rem' },
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <SansDigitsText text={product.name} />
          </Typography>
          <Typography
            sx={{
              fontFamily: shopSurface.font.body,
              fontSize: compact ? '0.68rem' : { xs: '0.78rem', sm: '0.85rem' },
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: ACCENT,
              mt: 0.35,
            }}
          >
            — {category}
          </Typography>
          <Typography
            sx={{
              fontFamily: shopSurface.font.body,
              fontStyle: 'italic',
              fontSize: compact ? { xs: '0.72rem', sm: '0.78rem' } : { xs: '0.82rem', sm: '0.92rem' },
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 1.55,
              mt: compact ? 0.5 : 1,
              mb: compact ? 0.85 : 1.75,
              display: '-webkit-box',
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </Typography>
          <Button
            component={RouterLink}
            to={`/products/${product.id}`}
            variant="contained"
            size={compact ? 'small' : 'medium'}
            sx={{
              alignSelf: 'flex-start',
              bgcolor: ACCENT_CTA,
              color: '#1a1410',
              fontFamily: shopSurface.font.body,
              fontWeight: 700,
              fontSize: compact ? '0.62rem' : '0.72rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              borderRadius: 999,
              px: compact ? 2 : 2.5,
              py: compact ? 0.55 : 1,
              mt: compact ? 0.75 : 0,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#d4b888', boxShadow: '0 8px 24px rgba(196, 165, 116, 0.35)' },
            }}
          >
            View piece →
          </Button>
        </Box>
      ) : null}
    </>
  );

  if (reduced) {
    return <Box sx={cardStyle}>{cardInner}</Box>;
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: direction > 0 ? `calc(-50% + 48px)` : `calc(-50% - 48px)`,
        scale: 0.92,
      }}
      animate={{
        opacity: hidden ? 0 : position === 'center' ? 1 : 0.55,
        x: xPosition,
        scale: position === 'center' ? 1 : 0.86,
        filter: position === 'center' ? 'blur(0px)' : 'blur(2.5px)',
        zIndex: position === 'center' ? 3 : 2,
      }}
      exit={{ opacity: 0, scale: 0.88, filter: 'blur(6px)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.95 }}
      style={{
        ...cardStyle,
        transform: undefined,
      }}
    >
      {cardInner}
    </motion.div>
  );
}

export function BestSellersShowcase({ products: externalProducts, variant = 'landing' }: BestSellersShowcaseProps) {
  const compact = variant === 'shop';
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const reduced = useReducedMotion();
  const { labelFor } = useCategories();
  const { ref: viewportRef, inView } = useInView({ threshold: 0.2 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(() => externalProducts == null);
  const showLoading = useMinimumLoading(loading && products.length === 0);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const hasExternalProducts = externalProducts != null;
  const externalProductKey = useMemo(
    () => (externalProducts ?? []).map((product) => product.id).join(','),
    [externalProducts],
  );

  useEffect(() => {
    if (hasExternalProducts) {
      const sorted = sortProductsByCreatedDesc(
        (externalProducts ?? []).filter((p) => p.isActive !== false),
      );
      const next = sorted.slice(0, 8);
      let changed = false;
      setProducts((prev) => {
        if (prev.length === next.length && prev.every((product, i) => product.id === next[i]?.id)) {
          return prev;
        }
        changed = true;
        return next;
      });
      if (changed) setIndex(0);
      setLoading((current) => (current ? false : current));
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await apiFetch<{ products: ProductSummary[] }>('/api/products');
        if (cancelled) return;
        const sorted = sortProductsByCreatedDesc(data.products.filter((p) => p.isActive !== false));
        const next = sorted.slice(0, 8);
        let changed = false;
        setProducts((prev) => {
          if (prev.length === next.length && prev.every((product, i) => product.id === next[i]?.id)) {
            return prev;
          }
          changed = true;
          return next;
        });
        if (changed) setIndex(0);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasExternalProducts, externalProductKey]);

  const step = useCallback(
    (delta: number) => {
      if (products.length <= 1) return;
      setDirection(delta);
      setIndex((current) => wrapIndex(current + delta, products.length));
    },
    [products.length],
  );

  useEffect(() => {
    if (!inView || products.length <= 1 || paused || reduced) return;
    const timer = window.setInterval(() => step(1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [inView, products.length, paused, reduced, step]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || products.length <= 1) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

      setPaused(false);
      step(dx > 0 ? -1 : 1);
    },
    [products.length, step],
  );

  const handlePointerDown = useCallback((event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start || start.pointerId !== event.pointerId || products.length <= 1) return;
      pointerStartRef.current = null;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

      setPaused(false);
      step(dx > 0 ? -1 : 1);
    },
    [products.length, step],
  );

  const handlePointerCancel = useCallback((event: PointerEvent) => {
    if (pointerStartRef.current?.pointerId === event.pointerId) {
      pointerStartRef.current = null;
    }
  }, []);

  const handleWheel = useCallback(
    (event: globalThis.WheelEvent) => {
      if (products.length <= 1 || wheelLockRef.current) return;

      const { deltaX, deltaY } = event;
      if (Math.abs(deltaX) < WHEEL_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;

      event.preventDefault();
      wheelLockRef.current = true;
      setPaused(false);
      step(deltaX > 0 ? 1 : -1);
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 400);
    },
    [products.length, step],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const active = products[index];
  const visibleSlides =
    products.length > 0
      ? products.length === 1
        ? [{ product: products[0], position: 'center' as const, isActive: true }]
        : [
            {
              product: products[wrapIndex(index - 1, products.length)],
              position: 'left' as const,
              isActive: false,
            },
            { product: products[index], position: 'center' as const, isActive: true },
            {
              product: products[wrapIndex(index + 1, products.length)],
              position: 'right' as const,
              isActive: false,
            },
          ]
      : [];

  return (
    <Box
      ref={viewportRef}
      component="section"
      aria-label="Best sellers"
      sx={{
        bgcolor: SECTION_BG,
        color: '#fff',
        width: '100%',
        height: compact ? SHOP_BANNER_HEIGHT : 'auto',
        minHeight: compact ? SHOP_BANNER_HEIGHT : undefined,
        py: compact ? 0 : { xs: 5, md: 7 },
        px: compact ? 0 : { xs: 2, sm: 3 },
        overflowX: 'clip',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
          px: compact ? 0 : 0,
          py: compact ? { xs: 1.75, sm: 2 } : 0,
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <BestSellersHeading compact={compact} />

        {showLoading ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: compact ? 4 : 6,
            }}
          >
            <BrandFillLoader variant="compact" aria-label="Loading highlights" />
          </Box>
        ) : products.length === 0 ? null : (
          <>
            <Box
              ref={stageRef}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setPaused(true);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setPaused(false);
              }}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              sx={{
                position: 'relative',
                flex: 1,
                minHeight: compact ? (isMobile ? 210 : 200) : 0,
                height: compact
                  ? isMobile
                    ? 210
                    : 'auto'
                  : { xs: 380, sm: 440, md: 480 },
                mx: 'auto',
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                touchAction: 'pan-y pinch-zoom',
                cursor: products.length > 1 ? 'grab' : 'default',
                userSelect: 'none',
              }}
            >
              {products.length > 1 ? (
                <>
                  <IconButton
                    type="button"
                    aria-label="Previous best seller"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPaused(false);
                      step(-1);
                    }}
                    sx={{
                      position: 'absolute',
                      left: compact ? { xs: 4, sm: 8 } : { xs: 8, sm: 16 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 5,
                      bgcolor: 'rgba(15, 15, 16, 0.72)',
                      color: ACCENT,
                      border: '1px solid rgba(201, 184, 154, 0.35)',
                      width: compact ? 34 : 42,
                      height: compact ? 34 : 42,
                      '&:hover': { bgcolor: 'rgba(15, 15, 16, 0.92)', borderColor: ACCENT },
                    }}
                  >
                    <IconChevronLeft fontSize="small" />
                  </IconButton>
                  <IconButton
                    type="button"
                    aria-label="Next best seller"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPaused(false);
                      step(1);
                    }}
                    sx={{
                      position: 'absolute',
                      right: compact ? { xs: 4, sm: 8 } : { xs: 8, sm: 16 },
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 5,
                      bgcolor: 'rgba(15, 15, 16, 0.72)',
                      color: ACCENT,
                      border: '1px solid rgba(201, 184, 154, 0.35)',
                      width: compact ? 34 : 42,
                      height: compact ? 34 : 42,
                      '&:hover': { bgcolor: 'rgba(15, 15, 16, 0.92)', borderColor: ACCENT },
                    }}
                  >
                    <IconChevronRight fontSize="small" />
                  </IconButton>
                </>
              ) : null}
              <AnimatePresence mode="popLayout" custom={direction}>
                {visibleSlides.map((slide) => (
                  <SlideCard
                    key={`${slide.product.id}-${slide.position}-${index}`}
                    product={slide.product}
                    category={categoryLabel(slide.product, labelFor)}
                    isActive={slide.isActive}
                    position={slide.position}
                    reduced={reduced}
                    direction={direction}
                    compact={compact}
                    isMobile={isMobile}
                  />
                ))}
              </AnimatePresence>
            </Box>

            {products.length > 1 ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 0.6,
                  mt: compact ? 0.75 : 3,
                  pb: compact ? 0.25 : 0,
                  flexShrink: 0,
                  px: compact ? { xs: 2, sm: 3 } : 0,
                }}
              >
                {products.map((product, dotIndex) => {
                  const activeDot = dotIndex === index;
                  return (
                    <Box
                      key={product.id}
                      component="button"
                      type="button"
                      aria-label={`Show ${product.name}`}
                      aria-current={activeDot ? 'true' : undefined}
                      onClick={() => {
                        setPaused(false);
                        setDirection(dotIndex > index ? 1 : -1);
                        setIndex(dotIndex);
                      }}
                      sx={{
                        width: activeDot ? (compact ? 18 : 24) : 7,
                        height: compact ? 6 : 8,
                        border: 'none',
                        borderRadius: 99,
                        p: 0,
                        cursor: 'pointer',
                        bgcolor: activeDot ? ACCENT : 'rgba(255,255,255,0.22)',
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                      }}
                    />
                  );
                })}
              </Box>
            ) : null}
          </>
        )}

        {!compact && active && !loading ? (
          <Box sx={{ textAlign: 'center', mt: { xs: 4, md: 5 } }}>
            <Button
              component={RouterLink}
              to="/shop"
              variant="outlined"
              sx={{
                borderColor: 'rgba(201, 184, 154, 0.45)',
                color: ACCENT,
                fontFamily: shopSurface.font.body,
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderRadius: 999,
                px: 3,
                py: 1.1,
                '&:hover': {
                  borderColor: ACCENT,
                  bgcolor: 'rgba(201, 184, 154, 0.08)',
                },
              }}
            >
              Explore the collection
            </Button>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
