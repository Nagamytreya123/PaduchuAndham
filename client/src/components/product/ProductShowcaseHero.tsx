import { useEffect, useMemo, useRef } from 'react';
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
import { IconChevronLeft, IconChevronRight } from '../../icons';
import type { ProductSummary } from '../../types/product';
import { formatInrFromPaise } from '../../utils/format';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  floatingIdle,
  imageFrameReduced,
  imageFrameVariants,
  navButtonHover,
  navButtonTap,
  parallaxBgReduced,
  parallaxBgVariants,
  peekColumnVariantsWithDir,
  showcaseSlideReduced,
  showcaseSlideVariants,
  staggerTextContainer,
  staggerTextItem,
  staggerTextReduced,
  wordmarkParallaxReduced,
  wordmarkParallaxVariants,
} from '../../motion/productShowcaseVariants';

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
  /** Next catalog item for trailing-edge peek; omit when none */
  peekNext: ProductSummary | null;
  /** 0-based index in `catalogLength` for dot strip */
  catalogIndex: number;
  catalogLength: number;
  onNavigate: (productId: string, dir: 1 | -1) => void;
};

const peekColumnReduced = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.14 } },
};

/**
 * Dual-stage product hero: dominant hero + trailing peek, parallax wordmark,
 * directional transitions, staggered copy (title → price → body → meta → nav).
 */
export function ProductShowcaseHero({
  product,
  direction,
  prevId,
  nextId,
  peekNext,
  catalogIndex,
  catalogLength,
  onNavigate,
}: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const isCoarse = useMediaQuery('(hover: none), (pointer: coarse)');
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const enableSwipe = isCoarse && !reduced;

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

  const slideVariants = reduced ? showcaseSlideReduced : showcaseSlideVariants;
  const bgVariants = reduced ? parallaxBgReduced : parallaxBgVariants;
  const wmVariants = reduced ? wordmarkParallaxReduced : wordmarkParallaxVariants;
  const peekVariants = reduced ? peekColumnReduced : peekColumnVariantsWithDir;
  const frameVariants = reduced ? imageFrameReduced : imageFrameVariants;
  const textItemVariants = reduced ? staggerTextReduced : staggerTextItem;
  const textContainerVariants = reduced ? { enter: {}, center: {}, exit: {} } : staggerTextContainer;

  const descPreview = useMemo(() => {
    const d = product.description?.trim() || 'No description';
    if (d.length <= DESC_PREVIEW_LEN) return d;
    return `${d.slice(0, DESC_PREVIEW_LEN).trim()}…`;
  }, [product.description]);

  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.price;
  const peekImg = peekNext?.images[0];
  const showPeek = Boolean(nextId && peekNext && peekImg);
  const dotCount = Math.max(0, catalogLength);
  const safeIndex = dotCount > 0 ? Math.min(Math.max(0, catalogIndex), dotCount - 1) : 0;

  useEffect(() => {
    if (reduced) return;
    const el = document.getElementById(titleId);
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [product.id, titleId, reduced]);

  function handlePointerMove(e: React.PointerEvent) {
    if (reduced || !containerRef.current) return;
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

  const img = product.images[0];

  const dualStageRow = (
    <Stack
      direction={isNarrow ? 'column' : 'row'}
      spacing={isNarrow ? 1.5 : 0}
      alignItems="stretch"
      sx={{
        position: 'relative',
        zIndex: 1,
        minHeight: { xs: 260, sm: 300 },
      }}
    >
      {/* Dominant hero — ~62–72% width desktop (spec §2.2) */}
      <Box
        sx={{
          flex: isNarrow ? '1 1 auto' : '0 0 68%',
          maxWidth: isNarrow ? '100%' : '68%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <motion.div
          animate={floatingIdle(reduced)}
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
                rotate: reduced ? 0 : 3,
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
                  component="img"
                  src={img}
                  alt=""
                  loading="eager"
                  decoding="async"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <Box sx={{ height: '100%', minHeight: 220 }} />
              )}
            </Box>
            </motion.div>
          </motion.div>
        </motion.div>
      </Box>

      {/* Adjacent peek — ~28–38% visible, subordinate treatment (spec §2.2) */}
      <Box
        sx={{
          flex: isNarrow ? '0 0 auto' : '0 0 32%',
          maxWidth: isNarrow ? '100%' : '32%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isNarrow ? 'flex-end' : 'flex-start',
          overflow: 'hidden',
          pl: isNarrow ? 0 : 1,
          pr: isNarrow ? 0 : 0,
          minHeight: isNarrow ? 100 : 'auto',
        }}
      >
        {showPeek ? (
          <motion.div
            custom={direction}
            variants={peekVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ width: isNarrow ? '42%' : '100%', maxWidth: 280 }}
          >
            <Box
              component="button"
              type="button"
              onClick={() => nextId && onNavigate(nextId, 1)}
              aria-label={`Next: ${peekNext!.name}`}
              sx={{
                position: 'relative',
                width: '100%',
                p: 0,
                border: 'none',
                cursor: 'pointer',
                bgcolor: 'transparent',
                borderRadius: 3,
                overflow: 'hidden',
                textAlign: 'left',
                display: 'block',
                filter: reduced ? 'none' : 'blur(2px)',
                boxShadow: `0 12px 36px ${alpha('#000', 0.28)}`,
                transition: 'filter 0.2s ease, opacity 0.2s ease',
                '&:hover': {
                  filter: 'blur(0px)',
                  opacity: 1,
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 3,
                },
              }}
            >
              <Box
                component="img"
                src={peekImg}
                alt=""
                sx={{
                  width: '135%',
                  height: 160,
                  maxHeight: { xs: 120, sm: 200 },
                  objectFit: 'cover',
                  objectPosition: 'left center',
                  display: 'block',
                  ml: '-8%',
                }}
              />
              <Typography
                variant="caption"
                noWrap
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  px: 1,
                  py: 0.5,
                  background: `linear-gradient(transparent, ${alpha('#0F0F10', 0.92)})`,
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Next
              </Typography>
            </Box>
          </motion.div>
        ) : (
          <Box sx={{ flex: 1, minHeight: isNarrow ? 0 : 120 }} />
        )}
      </Box>
    </Stack>
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
          borderRadius: { xs: 2.5, sm: 3.5 },
          overflow: 'hidden',
          minHeight: { xs: 400, sm: 440 },
          isolation: 'isolate',
          px: { xs: 2, sm: 2.75 },
          py: { xs: 2, sm: 2.5 },
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: `0 40px 100px ${alpha('#000', 0.35)}`,
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={product.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              position: 'relative',
              width: '100%',
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
                style={{ touchAction: enableSwipe ? 'pan-y' : undefined }}
              >
                <Stack spacing={2.25}>
                  {dualStageRow}

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

                      {/* Nav + dots last (spec §3.3) */}
                      <motion.div custom={direction} variants={textItemVariants}>
                        <Stack direction="column" spacing={1.25} sx={{ pt: 0.5 }}>
                          {dotCount > 1 ? (
                            <Stack direction="row" justifyContent="center" alignItems="center" gap={0.75} flexWrap="wrap" aria-hidden>
                              {Array.from({ length: dotCount }, (_, i) => (
                                <Box
                                  key={i}
                                  sx={{
                                    width: i === safeIndex ? 9 : 6,
                                    height: i === safeIndex ? 9 : 6,
                                    borderRadius: '50%',
                                    bgcolor: i === safeIndex ? 'primary.main' : alpha(theme.palette.common.white, 0.22),
                                    boxShadow:
                                      i === safeIndex ? `0 0 14px ${alpha(theme.palette.primary.main, 0.45)}` : 'none',
                                    transition: 'width 0.2s ease, height 0.2s ease, background-color 0.2s ease',
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : null}
                          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                            <motion.div
                              whileHover={!prevId || reduced ? undefined : navButtonHover}
                              whileTap={!prevId || reduced ? undefined : navButtonTap}
                            >
                              <IconButton
                                aria-label="Previous product"
                                disabled={!prevId}
                                onClick={() => prevId && onNavigate(prevId, -1)}
                                sx={{
                                  cursor: prevId ? 'pointer' : 'default',
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                                  borderRadius: '50%',
                                  width: 48,
                                  height: 48,
                                  bgcolor: alpha(theme.palette.background.paper, 0.4),
                                  backdropFilter: reduced ? 'none' : 'blur(12px)',
                                }}
                              >
                                <IconChevronLeft />
                              </IconButton>
                            </motion.div>
                            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', flex: 1 }}>
                              {enableSwipe ? 'Swipe to browse' : 'Explore collection'}
                            </Typography>
                            <motion.div
                              whileHover={!nextId || reduced ? undefined : navButtonHover}
                              whileTap={!nextId || reduced ? undefined : navButtonTap}
                            >
                              <IconButton
                                aria-label="Next product"
                                disabled={!nextId}
                                onClick={() => nextId && onNavigate(nextId, 1)}
                                sx={{
                                  cursor: nextId ? 'pointer' : 'default',
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
                                  borderRadius: '50%',
                                  width: 48,
                                  height: 48,
                                  bgcolor: alpha(theme.palette.background.paper, 0.4),
                                  backdropFilter: reduced ? 'none' : 'blur(12px)',
                                }}
                              >
                                <IconChevronRight />
                              </IconButton>
                            </motion.div>
                          </Stack>
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
    </Box>
  );
}
