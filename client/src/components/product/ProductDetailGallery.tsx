import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { EditorialImageFrame } from '../EditorialImageFrame';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { PRODUCT_IMAGE_FALLBACK, resolveMediaUrls } from '../../utils/productImage';

type ProductDetailGalleryProps = {
  images: string[];
  productName: string;
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

export function ProductDetailGallery({ images, productName }: ProductDetailGalleryProps) {
  const slides = resolveMediaUrls(images);
  const displaySlides = slides.length > 0 ? slides : [PRODUCT_IMAGE_FALLBACK];
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMultiple = displaySlides.length > 1;

  const syncIndexFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.max(0, Math.min(displaySlides.length - 1, next)));
  }, [displaySlides.length]);

  const goTo = useCallback(
    (target: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollRef.current;
      if (!el) return;
      const wrapped = ((target % displaySlides.length) + displaySlides.length) % displaySlides.length;
      el.scrollTo({ left: wrapped * el.clientWidth, behavior });
      setIndex(wrapped);
    },
    [displaySlides.length],
  );

  useEffect(() => {
    setIndex(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'auto' });
  }, [images]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiple) return;

    el.addEventListener('scroll', syncIndexFromScroll, { passive: true });
    return () => el.removeEventListener('scroll', syncIndexFromScroll);
  }, [hasMultiple, syncIndexFromScroll]);

  return (
    <Box sx={{ position: 'relative', px: 1 }}>
      <Box
        ref={scrollRef}
        aria-label={`${productName} image gallery`}
        sx={{
          display: 'flex',
          overflowX: hasMultiple ? 'auto' : 'hidden',
          scrollSnapType: hasMultiple ? 'x mandatory' : 'none',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          touchAction: 'pan-x pan-y pinch-zoom',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {displaySlides.map((src, i) => (
          <Box
            key={`${src}-${i}`}
            sx={{
              flex: '0 0 100%',
              minWidth: 0,
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          >
            <EditorialImageFrame
              src={src}
              alt={displaySlides.length > 1 ? `${productName} — image ${i + 1}` : productName}
              inset
            />
          </Box>
        ))}
      </Box>

      <IconButton
        aria-label="Previous image"
        disabled={!hasMultiple}
        onClick={() => goTo(index - 1)}
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
        onClick={() => goTo(index + 1)}
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
            const active = i === index;
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
