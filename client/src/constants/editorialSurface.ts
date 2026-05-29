/** Lumière / wishlist editorial palette (from design reference) */
export const editorialSurface = {
  background: '#f9f9f9',
  surfaceDim: '#dadada',
  onSurface: '#1b1b1b',
  onSurfaceVariant: '#474747',
  outline: '#777777',
  outlineVariant: '#c6c6c6',
  primary: '#000000',
  onPrimary: '#e2e2e2',
  glassNav: 'rgba(238, 238, 238, 0.7)',
  font: {
    headline: '"Noto Serif", "Playfair Display", Georgia, serif',
    body: '"Inter", "Helvetica Neue", Arial, sans-serif',
  },
  label: {
    fontSize: '0.6875rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    fontWeight: 500,
  },
} as const;

export const editorialUnderlineSx = {
  textDecoration: 'none',
  position: 'relative' as const,
  '&::after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: -4,
    width: '100%',
    height: '1px',
    bgcolor: editorialSurface.primary,
  },
};
