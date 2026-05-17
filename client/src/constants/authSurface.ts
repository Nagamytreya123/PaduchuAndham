/**
 * Light-panel auth surface tokens (WCAG-oriented on #F5F5F5 / #FFFFFF).
 * Use on /login only; global MUI theme stays dark.
 */
export const authSurface = {
  stageBg: '#0B0B0C',
  /** Scrim over future video / motion layer (40–70% black) */
  scrim: 'linear-gradient(160deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.48) 45%, rgba(0,0,0,0.58) 100%)',
  /**
   * Barely tints the video so it stays vivid; readability comes from panel blur + text shadows.
   */
  scrimOverVideo: 'transparent',

  /**
   * Glass: translucent neutrals (not near-zero alpha — some engines snap that to opaque).
   * `backdrop-filter` must sit on an element NOT wrapped by Framer `transform` parents.
   */
  glass: {
    heroBg: 'rgba(252, 249, 244, 0.26)',
    formBg: 'rgba(255, 255, 255, 0.24)',
    nestedBg: 'rgba(255, 255, 255, 0.2)',
    nestedBackdrop: 'blur(18px) saturate(155%)',
    inputBg: 'rgba(255, 255, 255, 0.82)',
    border: 'rgba(255, 255, 255, 0.42)',
    borderDeep: 'rgba(26, 24, 20, 0.12)',
    backdrop: 'blur(24px) saturate(160%)',
    innerGlow: 'inset 0 1px 0 rgba(255, 255, 255, 0.35)',
    panelShadow: '0 12px 40px rgba(0, 0, 0, 0.14)',
  },

  panel: {
    bg: '#F5F5F5',
    border: 'rgba(26, 24, 20, 0.12)',
  },
  panelElevated: {
    bg: '#FFFFFF',
    border: 'rgba(26, 24, 20, 0.1)',
  },

  text: {
    /** ~15:1 on panel.bg */
    primary: '#1A1814',
    /** ≥4.5:1 on panel.bg for 14px normal */
    muted: '#4F483E',
    /** Large headings / UI chrome on white */
    onAccent: '#141210',
  },

  accent: '#B8922E',
  accentHover: '#9A7824',
  accentSoftBg: 'rgba(184, 146, 46, 0.14)',
  accentFocusRing: 'rgba(184, 146, 46, 0.42)',

  input: {
    bg: '#FFFFFF',
    /** Slightly stronger edge on frosted panels */
    borderOnGlass: '#9A9286',
    border: '#D4CFC4',
    borderHover: '#B8B0A4',
    borderFocus: '#8A7F6E',
    shadowInset: 'inset 0 1px 0 rgba(255,255,255,0.85)',
  },

  error: '#7A2E2E',
  errorBg: 'rgba(122, 46, 46, 0.08)',
  success: '#2F4D38',
} as const;
