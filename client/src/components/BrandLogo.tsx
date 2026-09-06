import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';
import brandLogoUrl from '../assets/brand-logo.png';

const MARK_SRC = '/logo-icon.png';

type BrandLogoProps = {
  /** Logo height in px; width scales from the image aspect ratio. */
  height?: number;
  to?: string | null;
  alt?: string;
  /** Small circular mark for favicon-style placements (admin collapsed sidebar, etc.). */
  variant?: 'full' | 'mark';
};

export function BrandLogo({
  height = 44,
  to = '/',
  alt = 'Paduchuandham',
  variant = 'full',
}: BrandLogoProps) {
  const src = variant === 'mark' ? MARK_SRC : brandLogoUrl;
  const isMark = variant === 'mark';

  const image = (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        height,
        width: isMark ? height : 'auto',
        maxWidth: isMark ? height : height * 0.95,
        objectFit: 'contain',
        display: 'block',
        borderRadius: isMark ? '50%' : 1.5,
        flexShrink: 0,
        boxShadow: isMark ? 'none' : '0 1px 4px rgba(5, 11, 24, 0.12)',
      }}
    />
  );

  if (to) {
    return (
      <Box
        component={RouterLink}
        to={to}
        aria-label={alt}
        sx={{
          display: 'inline-flex',
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        {image}
      </Box>
    );
  }

  return image;
}
