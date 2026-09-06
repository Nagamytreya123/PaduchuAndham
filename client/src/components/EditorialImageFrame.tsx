import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { editorialFrameSx } from '../constants/shopSurface';
import { EDITORIAL_IMAGE_SIZES, handleProductImageError, resolveMediaUrl } from '../utils/productImage';

type EditorialImageFrameProps = {
  src: string;
  alt?: string;
  /** Narrow side margins (~92% width), like the shopping-bag mockup */
  inset?: boolean;
  /** Use `eager` + fetchPriority="high" for above-the-fold LCP images. */
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  sx?: SxProps<Theme>;
};

/** 4:5 studio product frame — shared across Home, Shop, and Cart-style layouts */
export function EditorialImageFrame({
  src,
  alt = '',
  inset = false,
  loading = 'lazy',
  fetchPriority,
  sx,
}: EditorialImageFrameProps) {
  return (
    <Box
      sx={[
        editorialFrameSx.root,
        inset && editorialFrameSx.inset,
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        component="img"
        src={resolveMediaUrl(src)}
        alt={alt}
        width={800}
        height={1000}
        sizes={EDITORIAL_IMAGE_SIZES}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
        onError={handleProductImageError}
        sx={editorialFrameSx.img}
      />
    </Box>
  );
}
