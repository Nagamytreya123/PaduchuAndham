/** Homepage hero tokens — warm editorial e-commerce (reference-aligned) */
export const homeSurface = {
  pageBg: '#FFF6F0',
  pageGradient: 'linear-gradient(180deg, #FFF8F3 0%, #FFE9DC 48%, #FFE0D0 100%)',
  /** Warm band behind the category hero heading */
  heroBandBg: '#FFE2D3',
  /** Inset panel behind the coverflow carousel */
  carouselBg: '#FDF6EF',
  /** Inner frame behind the sliding product cards */
  carouselFrameBg: '#FFF2EA',
  cardBg: '#FFFFFF',
  ink: '#050B18',
  inkMuted: 'rgba(5, 11, 24, 0.62)',
  accent: '#E8487A',
  accentSoft: 'rgba(232, 72, 122, 0.14)',
  border: 'rgba(5, 11, 24, 0.1)',
  borderStrong: 'rgba(232, 72, 122, 0.55)',
  shadowSoft: '0 8px 28px rgba(5, 11, 24, 0.07)',
  indicatorDuration: '340ms',
  indicatorEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  font: {
    body: '"Inter", "Helvetica Neue", Arial, sans-serif',
    display: '"DM Serif Display", "Playfair Display", "Cormorant Garamond", Georgia, serif',
    category: '"Sora", sans-serif',
  },
  hideScrollbar: {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
  },
} as const;
