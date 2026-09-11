import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { EditorialImageFrame } from '../EditorialImageFrame';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { editorialSurface } from '../../constants/editorialSurface';
import { PRODUCT_IMAGE_FALLBACK, resolveMediaUrls } from '../../utils/productImage';

type ProductDetailGalleryProps = {
  images: string[];
  productName: string;
  inStock?: boolean;
};

/** White circular control + black chevron — matches editorial PDP mockup */
const galleryNavButtonSx = {
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 3,
  width: 40,
  height: 40,
  bgcolor: '#ffffff',
  color: '#000000',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  opacity: 1,
  '&:hover': {
    bgcolor: '#ffffff',
    color: '#000000',
  },
  '& .MuiSvgIcon-root': {
    color: '#000000',
    fontSize: '1.35rem',
  },
};

export function ProductDetailGallery({ images, productName, inStock = true }: ProductDetailGalleryProps) {
  const slideSetKey = useMemo(() => (images ?? []).join('\u0000'), [images]);
  const displaySlides = useMemo(() => {
    const slides = resolveMediaUrls(images);
    return slides.length > 0 ? slides : [PRODUCT_IMAGE_FALLBACK];
  }, [slideSetKey]);
  const [index, setIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const hasMultiple = displaySlides.length > 1;
  const safeIndex = Math.min(Math.max(index, 0), displaySlides.length - 1);
  const currentSrc = displaySlides[safeIndex]!;

  const goTo = useCallback(
    (target: number) => {
      if (displaySlides.length <= 1) return;
      const wrapped = ((target % displaySlides.length) + displaySlides.length) % displaySlides.length;
      setIndex((current) => (current === wrapped ? current : wrapped));
    },
    [displaySlides.length],
  );

  useEffect(() => {
    setIndex(0);
  }, [slideSetKey]);

  return (
    <Box sx={{ position: 'relative', px: 1 }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          aria-label={`${productName} image gallery`}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchStartXRef.current = touch?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartXRef.current;
            touchStartXRef.current = null;
            if (startX == null || !hasMultiple) return;
            const touch = event.changedTouches[0];
            if (!touch) return;
            const delta = touch.clientX - startX;
            if (Math.abs(delta) < 48) return;
            goTo(safeIndex + (delta > 0 ? -1 : 1));
          }}
          sx={{
            opacity: inStock ? 1 : 0.58,
            transition: 'opacity 0.25s ease',
            touchAction: 'pan-y pinch-zoom',
            ...(!inStock && { '& img': { filter: 'grayscale(35%)' } }),
          }}
        >
          <EditorialImageFrame
            key={currentSrc}
            src={currentSrc}
            alt={hasMultiple ? `${productName} — image ${safeIndex + 1}` : productName}
            inset
            loading={safeIndex === 0 ? 'eager' : 'lazy'}
            fetchPriority={safeIndex === 0 ? 'high' : undefined}
          />
        </Box>
        {!inStock ? (
          <>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(255, 255, 255, 0.42)',
                pointerEvents: 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: hasMultiple ? 48 : 16,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <Typography
                sx={{
                  ...editorialSurface.label,
                  fontSize: '0.65rem',
                  letterSpacing: '0.16em',
                  bgcolor: 'rgba(15, 15, 16, 0.88)',
                  color: '#F5F0E6',
                  px: 1.75,
                  py: 0.9,
                }}
              >
                Out of stock
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>

      <IconButton
        aria-label="Previous image"
        disabled={!hasMultiple}
        onClick={() => goTo(safeIndex - 1)}
        sx={{
          ...galleryNavButtonSx,
          left: 'calc(4% + 10px)',
          visibility: hasMultiple ? 'visible' : 'hidden',
        }}
      >
        <IconChevronLeft />
      </IconButton>
      <IconButton
        aria-label="Next image"
        disabled={!hasMultiple}
        onClick={() => goTo(safeIndex + 1)}
        sx={{
          ...galleryNavButtonSx,
          right: 'calc(4% + 10px)',
          visibility: hasMultiple ? 'visible' : 'hidden',
        }}
      >
        <IconChevronRight />
      </IconButton>

      {hasMultiple ? (
        <Stack
          direction="row"
          spacing={0.75}
          role="tablist"
          aria-label="Product images"
          sx={{
            position: 'absolute',
            bottom: { xs: 14, sm: 18 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            px: 1.25,
            py: 0.75,
            borderRadius: 999,
            bgcolor: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(6px)',
            pointerEvents: 'auto',
          }}
        >
          {displaySlides.map((_, i) => {
            const active = i === safeIndex;
            return (
              <Box
                key={i}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Image ${i + 1} of ${displaySlides.length}`}
                onClick={() => goTo(i)}
                sx={{
                  width: active ? 8 : 6,
                  height: active ? 8 : 6,
                  p: 0,
                  border: 'none',
                  borderRadius: '50%',
                  bgcolor: active ? '#1b1b1b' : 'rgba(0, 0, 0, 0.28)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  transform: active ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            );
          })}
        </Stack>
      ) : null}
    </Box>
  );
}
