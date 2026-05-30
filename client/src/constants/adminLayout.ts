import type { SxProps, Theme } from '@mui/material/styles';

/** Symmetric horizontal inset for admin shell + page content (theme spacing units). */
export const ADMIN_CONTENT_PX = { xs: 2.5, sm: 3, md: 4 } as const;

/** Mobile fixed AppBar height (px) — keep in sync with AdminShell Toolbar minHeight. */
export const ADMIN_MOBILE_APPBAR_PX = 56;

const gridBase = {
  display: 'grid',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
} as const;

/** 1 col mobile → 3 cols from sm (Overview / Reviews KPI rows). */
export const adminMetricsGridSx: SxProps<Theme> = {
  ...gridBase,
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
  gap: { xs: 2, sm: 2.5 },
};

/** 1 → 2 → 3 cols (jewellery combos, loading skeletons). */
export const adminCardGridSx: SxProps<Theme> = {
  ...gridBase,
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
};

/** 1 → 2 → 3 → 4 cols (product catalog). */
export const adminCatalogGridSx: SxProps<Theme> = {
  ...gridBase,
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(3, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
  gap: 2,
};
