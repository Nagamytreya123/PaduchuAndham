/** Editorial storefront tokens (Home + Shop) */
export const shopSurface = {
  cream: '#F2EEE6',
  creamDeep: '#EFE8DC',
  bandTop: '#E8DFD4',
  bandBottom: '#8A7B6C',
  ink: '#050B18',
  inkMuted: '#5c5c5c',
  white: '#ffffff',
  badge: '#8A8175',
  font: {
    display: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    body: '"Inter", "Helvetica Neue", Arial, sans-serif',
  },
  pdpTypography: {
    label: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.6875rem',
      fontWeight: 500,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
    },
    title: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: { xs: '1.75rem', sm: '2rem' },
      fontWeight: 500,
      lineHeight: 1.2,
    },
    price: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    body: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    valueSerif: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '1rem',
    },
    cta: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
    },
  },
  logo: {
    fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    fontWeight: 500,
    fontSize: { xs: '0.7rem', sm: '0.8rem' },
    letterSpacing: { xs: '0.32em', sm: '0.38em' },
    textTransform: 'uppercase' as const,
    lineHeight: 1,
  },
  /** Cart, account, and other in-shell pages */
  pageTitle: {
    fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    fontWeight: 500,
    fontSize: { xs: '2rem', sm: '2.35rem' },
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    color: '#050B18',
  },
  card: {
    p: 2,
    borderRadius: 2,
    bgcolor: 'rgba(255, 255, 255, 0.72)',
    border: '1px solid rgba(5, 11, 24, 0.08)',
    boxShadow: 'none',
  },
  cta: {
    py: 1.5,
    borderRadius: 0,
    bgcolor: '#050B18',
    color: '#ffffff',
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    '&:hover': { bgcolor: '#1a2233' },
  },
  /** High-contrast inset for order status, summaries, etc. on cream pages */
  insetPanel: {
    p: 2,
    borderRadius: 1.5,
    bgcolor: '#ffffff',
    border: '1px solid rgba(5, 11, 24, 0.12)',
    boxShadow: '0 1px 4px rgba(5, 11, 24, 0.06)',
  },
} as const;

/** 4:5 luxury product frame (shopping-bag / editorial mockup) */
export const editorialFrameSx = {
  root: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 5',
    overflow: 'hidden',
    bgcolor: '#E8E8E8',
    background:
      'radial-gradient(ellipse 85% 75% at 50% 42%, rgba(255, 255, 255, 0.52) 0%, #E8E8E8 100%)',
  },
  inset: {
    width: '92%',
    mx: 'auto',
  },
  img: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center center',
    display: 'block',
  },
} as const;

/** Hero editorial image — warm, minimalist fashion */
export const SHOP_HERO_IMAGE =
  'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=1200&q=85&auto=format';
