import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { handleProductImageError } from '../../utils/productImage';
import {
  lightboxBackdropVariants,
  lightboxPanelReduced,
  lightboxPanelVariants,
  lightboxSlideReduced,
  lightboxSlideVariants,
  lightboxThumbStrip,
} from '../../motion/productImageLightboxVariants';

type Props = {
  open: boolean;
  images: string[];
  index: number;
  productName: string;
  layoutId: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/**
 * Full-screen image lightbox — Motion layoutId shared transition + AnimatePresence exit.
 * Patterns from Motion docs: layout animations, AnimatePresence modal, directional slideshow.
 */
export function ProductImageLightbox({
  open,
  images,
  index,
  productName,
  layoutId,
  onClose,
  onIndexChange,
}: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const panelVariants = reduced ? lightboxPanelReduced : lightboxPanelVariants;
  const slideVariants = reduced ? lightboxSlideReduced : lightboxSlideVariants;
  const safeIndex = images.length ? Math.min(index, images.length - 1) : 0;
  const src = images[safeIndex];

  const go = useCallback(
    (delta: 1 | -1) => {
      if (images.length < 2) return;
      setSlideDir(delta);
      onIndexChange((safeIndex + delta + images.length) % images.length);
    },
    [images.length, onIndexChange, safeIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, go]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <LayoutGroup id={`lightbox-${layoutId}`}>
      <AnimatePresence>
        {open && src ? (
          <motion.div
            key="lightbox-root"
            layoutRoot
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} — enlarged photo ${safeIndex + 1} of ${images.length}`}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: theme.zIndex.modal + 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              variants={lightboxBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClose}
              style={{
                position: 'absolute',
                inset: 0,
                background: alpha('#000', 0.78),
                backdropFilter: reduced ? 'none' : 'blur(8px)',
              }}
            />

            <motion.div
              layoutId={layoutId}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                zIndex: 1,
                width: 'min(92vw, 880px)',
                maxHeight: 'min(88vh, 720px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: `0 32px 80px ${alpha('#000', 0.55)}`,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  bgcolor: 'grey.900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: { xs: 240, sm: 360 },
                }}
              >
                {images.length > 1 ? (
                  <>
                    <IconButton
                      aria-label="Previous photo"
                      onClick={() => go(-1)}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: alpha(theme.palette.common.black, 0.5),
                        color: 'primary.main',
                        '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.7) },
                      }}
                    >
                      <IconChevronLeft />
                    </IconButton>
                    <IconButton
                      aria-label="Next photo"
                      onClick={() => go(1)}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: alpha(theme.palette.common.black, 0.5),
                        color: 'primary.main',
                        '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.7) },
                      }}
                    >
                      <IconChevronRight />
                    </IconButton>
                  </>
                ) : null}

                <AnimatePresence mode="wait" custom={slideDir}>
                  <motion.img
                    key={src}
                    custom={slideDir}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    src={src}
                    alt=""
                    onError={handleProductImageError}
                    style={{
                      width: '100%',
                      maxHeight: 'min(72vh, 640px)',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </AnimatePresence>

                <IconButton
                  aria-label="Close enlarged photo"
                  onClick={onClose}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    bgcolor: alpha(theme.palette.common.black, 0.5),
                    color: 'common.white',
                    '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.72) },
                  }}
                >
                  ✕
                </IconButton>
              </Box>

              <motion.div
                variants={lightboxThumbStrip}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: alpha(theme.palette.background.paper, 0.96),
                  borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                }}
              >
                <StackRow
                  images={images}
                  activeIndex={safeIndex}
                  productName={productName}
                  onSelect={(i) => {
                    setSlideDir(i > safeIndex ? 1 : -1);
                    onIndexChange(i);
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                >
                  {safeIndex + 1} / {images.length}
                </Typography>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </LayoutGroup>,
    document.body,
  );
}

function StackRow({
  images,
  activeIndex,
  productName,
  onSelect,
}: {
  images: string[];
  activeIndex: number;
  productName: string;
  onSelect: (index: number) => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      {images.map((url, i) => (
        <Box
          key={url}
          component="button"
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`View photo ${i + 1} of ${images.length} for ${productName}`}
          aria-current={i === activeIndex ? 'true' : undefined}
          sx={{
            p: 0,
            border: '2px solid',
            borderColor: i === activeIndex ? 'primary.main' : 'transparent',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: 'pointer',
            width: 56,
            height: 56,
            bgcolor: 'grey.900',
            opacity: i === activeIndex ? 1 : 0.65,
            transition: 'opacity 0.2s, border-color 0.2s',
            '&:hover': { opacity: 1 },
          }}
        >
          <Box
            component="img"
            src={url}
            alt=""
            onError={handleProductImageError}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
      ))}
    </Box>
  );
}
