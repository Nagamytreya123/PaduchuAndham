import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AnimatePresence, motion } from 'framer-motion';
import { LUXURY_LOADER_MESSAGES } from '../../constants/luxuryLoaderImages';
import { LOADER_SVG_ITEMS } from './LuxuryLoaderSvgs';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const MESSAGE_MS = 2000;
const ICON_MS = 1800;

export type LuxuryLoaderTone = 'light' | 'dark';
export type LuxuryLoaderVariant = 'fullscreen' | 'inline' | 'compact' | 'overlay' | 'pdp';

type Props = {
  tone?: LuxuryLoaderTone;
  variant?: LuxuryLoaderVariant;
  message?: string;
  'aria-label'?: string;
};

const palettes = {
  light: {
    bg: 'linear-gradient(165deg, #F8F6F2 0%, #F2EEE6 45%, #E8E4DC 100%)',
    vignette: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,255,255,0.55) 0%, transparent 70%)',
    text: '#1b1b1b',
    textMuted: '#5c5c5c',
    stage: 'rgba(255,255,255,0.55)',
    stageBorder: 'rgba(255,255,255,0.75)',
    glow: 'rgba(214, 179, 106, 0.2)',
  },
  dark: {
    bg: 'linear-gradient(165deg, #0a0a0c 0%, #121218 50%, #0f0f10 100%)',
    vignette: 'radial-gradient(ellipse 75% 65% at 50% 38%, rgba(214,179,106,0.08) 0%, transparent 68%)',
    text: '#F5F5F5',
    textMuted: '#B8B0A0',
    stage: 'rgba(26, 26, 30, 0.65)',
    stageBorder: 'rgba(214, 179, 106, 0.2)',
    glow: 'rgba(214, 179, 106, 0.28)',
  },
} as const;

const loaderAnimationSx = {
  '@keyframes luxWatchBezelSpin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  '@keyframes luxWatchHour': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  '@keyframes luxWatchMinute': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  '@keyframes luxWatchSecond': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  '@keyframes luxChainWave': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-6px)' },
  },
  '@keyframes luxGemSparkle': {
    '0%, 100%': { opacity: 0.25, filter: 'brightness(0.85)' },
    '50%': { opacity: 1, filter: 'brightness(1.35) drop-shadow(0 0 4px rgba(255,255,255,0.9))' },
  },
  '@keyframes luxGemSweep': {
    '0%, 100%': { opacity: 0.2 },
    '50%': { opacity: 1 },
  },
  '& .lux-watch-bezel': {
    transformOrigin: '64px 64px',
    animation: 'luxWatchBezelSpin 2.5s linear infinite',
  },
  '& .lux-watch-hour': {
    animation: 'luxWatchHour 8s linear infinite',
  },
  '& .lux-watch-minute': {
    animation: 'luxWatchMinute 2s linear infinite',
  },
  '& .lux-watch-second': {
    animation: 'luxWatchSecond 0.8s linear infinite',
  },
  ...Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((i) => [
      `& .lux-chain-link:nth-of-type(${i + 1})`,
      {
        animation: 'luxChainWave 1.1s ease-in-out infinite',
        animationDelay: `${i * 0.08}s`,
      },
    ]),
  ),
  ...Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [
      `& .lux-bracelet-gem:nth-of-type(${i + 1})`,
      {
        animation: 'luxGemSparkle 1.2s ease-in-out infinite',
        animationDelay: `${i * 0.1}s`,
      },
    ]),
  ),
  '& .lux-bracelet-sparkle': {
    animation: 'luxGemSweep 1.2s ease-in-out infinite',
  },
};

const reducedMotionSx = {
  '& .lux-watch-bezel, & .lux-watch-hour, & .lux-watch-minute, & .lux-watch-second, & .lux-chain-link, & .lux-bracelet-gem':
    {
      animation: 'none !important',
    },
};

export function LuxuryShowcaseLoader({
  tone = 'light',
  variant = 'inline',
  message,
  'aria-label': ariaLabel = 'Loading',
}: Props) {
  const reduced = useReducedMotion();
  const palette = palettes[tone];
  const [iconIndex, setIconIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIconIndex((i) => (i + 1) % LOADER_SVG_ITEMS.length);
    }, ICON_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (message) return;
    const id = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % LUXURY_LOADER_MESSAGES.length);
    }, MESSAGE_MS);
    return () => window.clearInterval(id);
  }, [message]);

  const statusText = message ?? LUXURY_LOADER_MESSAGES[messageIndex];
  const active = LOADER_SVG_ITEMS[iconIndex]!;
  const ActiveSvg = active.Component;

  const minHeight =
    variant === 'fullscreen'
      ? '100dvh'
      : variant === 'pdp'
        ? 'auto'
        : variant === 'compact'
          ? 140
          : variant === 'overlay'
            ? 'auto'
            : { xs: 200, sm: 220 };

  const isOverlay = variant === 'overlay';
  const isPdp = variant === 'pdp';

  return (
    <Box
      className="lux-showcase-loader"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      sx={{
        position: variant === 'fullscreen' ? 'fixed' : 'relative',
        inset: variant === 'fullscreen' ? 0 : undefined,
        zIndex: variant === 'fullscreen' ? 1400 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        width: '100%',
        px: 2,
        py: variant === 'compact' || isOverlay || isPdp ? 0 : 2.5,
        background: isOverlay || isPdp ? 'transparent' : palette.bg,
        color: palette.text,
        overflow: 'hidden',
        ...(reduced ? reducedMotionSx : loaderAnimationSx),
      }}
    >
      {!isOverlay && !isPdp && (
        <Box
          aria-hidden
          sx={{ position: 'absolute', inset: 0, background: palette.vignette, pointerEvents: 'none' }}
        />
      )}

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 360,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: { xs: 132, sm: 148 },
            height: { xs: 132, sm: 148 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: -16,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
              filter: 'blur(8px)',
            }}
          />

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              bgcolor: palette.stage,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${palette.stageBorder}`,
              boxShadow: '0 20px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(214,179,106,0.08)',
            }}
          >
            <AnimatePresence mode="wait">
              <Box
                key={active.id}
                component={motion.div}
                initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ActiveSvg size={112} />
              </Box>
            </AnimatePresence>
          </Box>
        </Box>

        <AnimatePresence mode="wait">
          <Typography
            key={statusText}
            component={motion.p}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              fontWeight: 500,
              letterSpacing: '0.06em',
              color: palette.textMuted,
              textAlign: 'center',
              minHeight: '1.5em',
            }}
          >
            {statusText}
          </Typography>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
