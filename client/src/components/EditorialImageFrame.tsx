import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { editorialFrameSx } from '../constants/shopSurface';
import { handleProductImageError } from '../utils/productImage';

type EditorialImageFrameProps = {
  src: string;
  alt?: string;
  /** Narrow side margins (~92% width), like the shopping-bag mockup */
  inset?: boolean;
  sx?: SxProps<Theme>;
};

/** 4:5 studio product frame — shared across Home, Shop, and Cart-style layouts */
export function EditorialImageFrame({ src, alt = '', inset = false, sx }: EditorialImageFrameProps) {
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
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleProductImageError}
        sx={editorialFrameSx.img}
      />
    </Box>
  );
}
