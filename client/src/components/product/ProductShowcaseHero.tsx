import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { ProductSummary } from '../../types/product';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { formatInrFromPaise } from '../../utils/format';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  floatingIdle,
  imageFrameReduced,
  imageFrameVariants,
  imageFrameVariantsMobile,
  parallaxBgReduced,
  parallaxBgVariants,
  showcaseSlideReduced,
  showcaseSlideVariants,
  showcaseSlideVariantsMobile,
  staggerTextContainer,
  staggerTextContainerMobile,
  staggerTextItem,
  staggerTextItemMobile,
  staggerTextReduced,
  wordmarkParallaxReduced,
  wordmarkParallaxVariants,
} from '../../motion/productShowcaseVariants';
import { ProductImageLightbox } from './ProductImageLightbox';
import { handleProductImageError } from '../../utils/productImage';

const SWIPE_COMMIT = 72;
const SWIPE_VELOCITY = 420;
export const PRODUCT_SHOWCASE_PREVIEW_LEN = 200;
const DESC_PREVIEW_LEN = PRODUCT_SHOWCASE_PREVIEW_LEN;

/** Ambient studio wordmark — low contrast depth (spec §2, §6) */
const SHOWCASE_WORDMARK = 'Paduchuandham';

type Props = {
  product: ProductSummary;
  direction: 1 | -1;
  prevId: string | null;
  nextId: string | null;
  onNavigate: (productId: string, dir: 1 | -1) => void;
};

/**
 * Product hero: full-width image, parallax wordmark, directional transitions, staggered copy.
 * Next/previous catalogue items: swipe on touch (no on-card preview of the next SKU).
 */
export function ProductShowcaseHero({
  product,
  direction,
  prevId,
  nextId,
  onNavigate,
}: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const isCoarse = useMediaQuery('(hover: none), (pointer: coarse)');
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const enableSwipe = isCoarse && !reduced;
  /** Desktop/laptop only — touch devices keep swipe. */
  const showCatalogNavButtons = !isCoarse && !isNarrow;

  /** Pointer parallax: 2–6px translate, ~2–4° tilt (spec §4) */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const parallaxSpringConfig = { stiffness: 300, damping: 40 };
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), parallaxSpringConfig);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), parallaxSpringConfig);
  const imgTx = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), parallaxSpringConfig);
  const imgTy = useSpring(useTransform(my, [-0.5, 0.5], [-5, 5]), parallaxSpringConfig);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = `showcase-product-title-${product.id}`;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const galleryImages = useMemo(
    () => product.images.filter((url) => typeof url === 'string' && url.trim().length > 0),
    [product.images],
  );

  const layoutId = `product-hero-image-${product.id}`;

  useEffect(() => {
    setActiveImageIndex(0);
    setLightboxOpen(false);
  }, [product.id]);

  const slideVariants = reduced
    ? showcaseSlideReduced
    : isNarrow
      ? showcaseSlideVariantsMobile
      : showcaseSlideVariants;
  const bgVariants = reduced ? parallaxBgReduced : parallaxBgVariants;
  const wmVariants = reduced ? wordmarkParallaxReduced : wordmarkParallaxVariants;
  const frameVariants = reduced ? imageFrameReduced : isNarrow ? imageFrameVariantsMobile : imageFrameVariants;
  const textItemVariants = reduced
    ? staggerTextReduced
    : isNarrow
      ? staggerTextItemMobile
      : staggerTextItem;
  const textContainerVariants = reduced
    ? { enter: {}, center: {}, exit: {} }
    : isNarrow
      ? staggerTextContainerMobile
      : staggerTextContainer;

  const descPreview = useMemo(() => {
    const d = product.description?.trim() || 'No description';
    if (d.length <= DESC_PREVIEW_LEN) return d;
    return `${d.slice(0, DESC_PREVIEW_LEN).trim()}…`;
  }, [product.description]);

  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;

  useEffect(() => {
    if (reduced) return;
    const el = document.getElementById(titleId);
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [product.id, titleId, reduced]);

  function handlePointerMove(e: React.PointerEvent) {
    if (reduced || isNarrow || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    mx.set(Math.max(-0.5, Math.min(0.5, nx)));
    my.set(Math.max(-0.5, Math.min(0.5, ny)));
  }

  function handlePointerLeave() {
    mx.set(0);
    my.set(0);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_COMMIT || velocity.x < -SWIPE_VELOCITY) {
      if (nextId) onNavigate(nextId, 1);
    } else if (offset.x > SWIPE_COMMIT || velocity.x > SWIPE_VELOCITY) {
      if (prevId) onNavigate(prevId, -1);
    }
  }

  const img = galleryImages[activeImageIndex] ?? galleryImages[0];

  const heroImage = (
    <Box
      sx={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <motion.div
        animate={floatingIdle(reduced || isNarrow)}
        style={{ width: '100%' }}
      >
        <motion.div
          custom={direction}
          variants={frameVariants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{
            perspective: 1200,
            transformStyle: 'preserve-3d',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 28px 72px ${alpha('#000', 0.5)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.14)}`,
          }}
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              x: imgTx,
              y: imgTy,
              transformStyle: 'preserve-3d',
              rotate: reduced || isNarrow ? 0 : 3,
            }}
          >
            <Box
              sx={{
                aspectRatio: '4 / 3',
                maxHeight: { xs: 360, sm: 400, md: 420 },
                bgcolor: 'grey.900',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {img ? (
                <Box
                  component={motion.button}
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={`View enlarged photo of ${product.name}`}
                  initial={false}
                  whileHover={reduced ? undefined : { scale: 1.015 }}
                  whileTap={reduced ? undefined : { scale: 0.985 }}
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    p: 0,
                    border: 0,
                    cursor: 'zoom-in',
                    bgcolor: 'transparent',
                    position: 'relative',
                  }}
                >
                  {!lightboxOpen ? (
                    <Box
                      component={motion.img}
                      layoutId={layoutId}
                      src={img}
                      alt=""
                      loading="eager"
                      decoding="async"
                      onError={handleProductImageError}
                      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        minHeight: 220,
                        bgcolor: 'grey.900',
                      }}
                    />
                  )}
                </Box>
              ) : (
                <Box sx={{ height: '100%', minHeight: 220 }} />
              )}
            </Box>
          </motion.div>
        </motion.div>
      </motion.div>

      {galleryImages.length > 1 ? (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1.25, flexWrap: 'wrap', justifyContent: 'center' }}
          role="list"
          aria-label={`${product.name} photo gallery`}
        >
          {galleryImages.map((url, i) => (
            <Box
              key={`${url}-${i}`}
              component="button"
              type="button"
              role="listitem"
              onClick={() => setActiveImageIndex(i)}
              aria-label={`Show photo ${i + 1} of ${galleryImages.length}`}
              aria-current={i === activeImageIndex ? 'true' : undefined}
              sx={{
                p: 0,
                border: '2px solid',
                borderColor: i === activeImageIndex ? 'primary.main' : alpha(theme.palette.common.white, 0.12),
                borderRadius: 1.25,
                overflow: 'hidden',
                cursor: 'pointer',
                width: { xs: 56, sm: 64 },
                height: { xs: 56, sm: 64 },
                flexShrink: 0,
                bgcolor: 'grey.900',
                opacity: i === activeImageIndex ? 1 : 0.72,
                transition: 'opacity 0.2s, border-color 0.2s, transform 0.2s',
                '&:hover': { opacity: 1 },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                component="img"
                src={url}
                alt=""
                loading="lazy"
                onError={handleProductImageError}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Box>
          ))}
        </Stack>
      ) : null}
    </Box>
  );

  return (
    <Box
      sx={{
        maxWidth: 960,
        mx: 'auto',
        width: '100%',
      }}
    >
      <Box
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr',
          borderRadius: { xs: 2.5, sm: 3.5 },
          overflow: 'hidden',
          isolation: 'isolate',
          px: { xs: 2, sm: 2.75 },
          py: { xs: 2, sm: 2.5 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 40px 100px ${alpha('#000', 0.35)}`,
        }}
      >
        {showCatalogNavButtons ? (
          <>
            <IconButton
              aria-label="Previous product"
              disabled={!prevId}
              onClick={() => prevId && onNavigate(prevId, -1)}
              sx={{
                position: 'absolute',
                left: 12,
                top: '42%',
                zIndex: 10,
                bgcolor: alpha(theme.palette.common.black, 0.45),
                color: 'primary.main',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.black, 0.62),
                },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.common.black, 0.2),
                  color: alpha(theme.palette.primary.main, 0.35),
                },
              }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              aria-label="Next product"
              disabled={!nextId}
              onClick={() => nextId && onNavigate(nextId, 1)}
              sx={{
                position: 'absolute',
                right: 12,
                top: '42%',
                zIndex: 10,
                bgcolor: alpha(theme.palette.common.black, 0.45),
                color: 'primary.main',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.black, 0.62),
                },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.common.black, 0.2),
                  color: alpha(theme.palette.primary.main, 0.35),
                },
              }}
            >
              <IconChevronRight />
            </IconButton>
          </>
        ) : null}
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={product.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              gridArea: '1 / 1',
              width: '100%',
              minWidth: 0,
              willChange: reduced ? 'opacity' : 'transform, opacity, filter',
            }}
          >
            <motion.div
              custom={direction}
              variants={bgVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                position: 'absolute',
                inset: -32,
                zIndex: 0,
                pointerEvents: 'none',
                background: `radial-gradient(ellipse 85% 55% at 42% 38%, ${alpha(
                  theme.palette.primary.main,
                  0.14,
                )} 0%, transparent 58%),
                linear-gradient(168deg, ${alpha('#16161d', 0.98)} 0%, ${alpha('#252032', 0.55)} 42%, ${alpha(
                  theme.palette.background.default,
                  1,
                )} 100%)`,
              }}
            />

            {/* Slower ambient wordmark (spec §2.1 z-layers, §3.1) */}
            <motion.div
              custom={direction}
              variants={wmVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{
                position: 'absolute',
                left: '4%',
                top: '14%',
                zIndex: 0,
                pointerEvents: 'none',
                maxWidth: '92%',
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", serif',
                  fontWeight: 400,
                  fontSize: { xs: 'clamp(3.25rem, 16vw, 5rem)', sm: 'clamp(4rem, 11vw, 7.5rem)' },
                  lineHeight: 0.85,
                  letterSpacing: '-0.03em',
                  color: alpha(theme.palette.common.white, 0.055),
                  filter: reduced ? 'none' : 'blur(1.5px)',
                  userSelect: 'none',
                }}
              >
                {SHOWCASE_WORDMARK}
              </Typography>
            </motion.div>

            <motion.div
              style={{
                position: 'relative',
                zIndex: 1,
              }}
            >
              <motion.div
                drag={enableSwipe ? 'x' : false}
                dragElastic={0.14}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                style={{ touchAction: enableSwipe ? 'pan-y' : undefined, position: 'relative' }}
                role="region"
                aria-label={
                  showCatalogNavButtons
                    ? 'Product showcase. Use the previous and next buttons, or swipe on touch devices, to browse nearby products.'
                    : 'Product showcase. Swipe left or right to browse nearby products in the catalogue.'
                }
              >
                <Typography
                  component="span"
                  sx={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                >
                  Swipe horizontally to open the next or previous product.
                </Typography>
                <Stack spacing={2.25}>
                  {heroImage}

                  <motion.div
                    custom={direction}
                    variants={textContainerVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    style={{ position: 'relative', zIndex: 2 }}
                  >
                    <Stack spacing={1.25}>
                      {/* Title first (spec §3.3) */}
                      <motion.div custom={direction} variants={textItemVariants}>
                        <Typography
                          id={titleId}
                          tabIndex={-1}
                          variant="h4"
                          sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                            lineHeight: 1.15,
                            outline: 'none',
                          }}
                        >
                          {product.name}
                        </Typography>
                      </motion.div>

                      <motion.div custom={direction} variants={textItemVariants}>
                        <Stack direction="row" alignItems="baseline" gap={1.5} flexWrap="wrap">
                          <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800 }}>
                            {formatInrFromPaise(product.price)}
                          </Typography>
                          {showCompare ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                              {formatInrFromPaise(product.compareAtPrice!)}
                            </Typography>
                          ) : null}
                        </Stack>
                      </motion.div>

                      <motion.div custom={direction} variants={textItemVariants}>
                        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                          {descPreview}
                        </Typography>
                      </motion.div>

                      <motion.div custom={direction} variants={textItemVariants}>
                        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                          <Chip label={product.category} color="primary" size="small" sx={{ fontWeight: 700 }} />
                          {product.subcategory ? (
                            <Chip label={product.subcategory} size="small" variant="outlined" />
                          ) : null}
                          {product.sku ? (
                            <Typography variant="caption" color="text.secondary">
                              SKU {product.sku}
                            </Typography>
                          ) : null}
                        </Stack>
                      </motion.div>
                    </Stack>
                  </motion.div>
                </Stack>
              </motion.div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </Box>

      <ProductImageLightbox
        open={lightboxOpen && galleryImages.length > 0}
        images={galleryImages}
        index={activeImageIndex}
        productName={product.name}
        layoutId={layoutId}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveImageIndex}
      />
    </Box>
  );
}
