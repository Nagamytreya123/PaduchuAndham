import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { EditorialImageFrame } from '../EditorialImageFrame';
import { IconChevronLeft, IconChevronRight } from '../../icons';
import { PRODUCT_IMAGE_FALLBACK } from '../../utils/productImage';

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
  const slides = images.length > 0 ? images : [PRODUCT_IMAGE_FALLBACK];
  const [index, setIndex] = useState(0);
  const src = slides[index] ?? PRODUCT_IMAGE_FALLBACK;
  const hasMultiple = slides.length > 1;

  return (
    <Box sx={{ position: 'relative', px: 1 }}>
      <EditorialImageFrame src={src} alt={productName} inset />
      <IconButton
        aria-label="Previous image"
        disabled={!hasMultiple}
        onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
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
        onClick={() => setIndex((i) => (i + 1) % slides.length)}
        sx={{
          ...galleryNavButtonSx,
          right: 'calc(4% + 10px)',
          visibility: hasMultiple ? 'visible' : 'hidden',
        }}
      >
        <IconChevronRight />
      </IconButton>
    </Box>
  );
}
