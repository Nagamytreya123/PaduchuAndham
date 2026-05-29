/**
 * Auth surface — Aurum-inspired dark glass on cinematic jewelry video.
 * Playfair Display (headlines) + Inter (UI). Use on /login only.
 */
export const authSurface = {
  stageBg: '#0F0E0B',

  scrim: 'linear-gradient(180deg, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.32) 50%, rgba(0,0,0,0.52) 100%)',
  scrimOverVideo:
    'radial-gradient(ellipse 90% 80% at 50% 40%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.55) 100%)',

  font: {
    display: '"Playfair Display", Georgia, "Times New Roman", serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  glass: {
    cardBg: 'rgba(255, 255, 255, 0.06)',
    nestedBg: 'rgba(21, 19, 16, 0.35)',
    nestedBackdrop: 'blur(16px) saturate(140%)',
    inputBg: 'rgba(33, 31, 28, 0.45)',
    border: 'rgba(232, 216, 168, 0.28)',
    borderDeep: 'rgba(150, 144, 131, 0.22)',
    backdrop: 'blur(20px) saturate(150%)',
    innerGlow: 'inset 0 1px 0 rgba(255, 244, 219, 0.08)',
    panelShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
  },

  text: {
    /** Cream headline — high contrast on video */
    display: '#FFF4DB',
    primary: '#E7E2DC',
    muted: '#CDC6B8',
    faint: 'rgba(205, 198, 184, 0.72)',
    onAccent: '#151310',
  },

  accent: '#E9C349',
  accentHover: '#D5B03A',
  accentSoftBg: 'rgba(233, 195, 73, 0.14)',
  accentFocusRing: 'rgba(255, 224, 136, 0.45)',
  accentGlow: '0 0 12px rgba(255, 224, 136, 0.35)',

  input: {
    border: 'rgba(150, 144, 131, 0.35)',
    borderHover: 'rgba(205, 198, 184, 0.55)',
    borderFocus: '#FFE088',
    shadowInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  },

  error: '#FFB4AB',
  errorBg: 'rgba(147, 0, 10, 0.35)',
  warningBg: 'rgba(233, 195, 73, 0.12)',
} as const;
