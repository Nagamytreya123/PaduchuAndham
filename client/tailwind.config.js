/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'admin-blob': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(2%, -3%) scale(1.03)' },
          '66%': { transform: 'translate(-2%, 2%) scale(0.98)' },
        },
        'admin-grid': {
          '0%': { opacity: '0.04' },
          '50%': { opacity: '0.07' },
          '100%': { opacity: '0.04' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'admin-blob': 'admin-blob 28s ease-in-out infinite',
        'admin-blob-slow': 'admin-blob 42s ease-in-out infinite reverse',
        'admin-grid': 'admin-grid 14s ease-in-out infinite',
        shimmer: 'shimmer 1.2s ease-in-out infinite',
      },
      backgroundImage: {
        'noise-fine':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
