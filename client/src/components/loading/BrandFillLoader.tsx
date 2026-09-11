import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { motion } from 'framer-motion';
import brandLogoUrl from '../../assets/brand-logo.png';
import { shopSurface } from '../../constants/shopSurface';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const BRAND_TEXT = 'PADUCHUANDHAM';
const LETTERS = BRAND_TEXT.split('');

const GOLD_FILL = 'linear-gradient(180deg, #F0D78C 0%, #D6B36A 55%, #B8954A 100%)';

export type BrandFillLoaderVariant = 'fullscreen' | 'inline' | 'overlay' | 'pdp' | 'compact';

type Props = {
  variant?: BrandFillLoaderVariant;
  'aria-label'?: string;
  /** Smoothly scroll this loader into the vertical center of the viewport when shown. */
  scrollIntoView?: boolean;
  /** Changing this value re-triggers scroll-into-view while the loader is visible. */
  scrollToken?: string;
  id?: string;
};

const motionKeyframes = {
  '@keyframes brandLetterFill': {
    '0%': { clipPath: 'inset(0 100% 0 0 round 1px)' },
    '16%': { clipPath: 'inset(0 50% 0 0 round 1px)' },
    '30%': { clipPath: 'inset(0 25% 0 0 round 1px)' },
    '42%': { clipPath: 'inset(0 10% 0 0 round 1px)' },
    '54%, 86%': { clipPath: 'inset(0 0 0 0 round 1px)' },
    '100%': { clipPath: 'inset(0 100% 0 0 round 1px)' },
  },
  '@keyframes brandOrbPulse': {
    '0%, 100%': { opacity: 0.45, transform: 'scale(1) translate(0, 0)' },
    '50%': { opacity: 0.75, transform: 'scale(1.08) translate(2%, -1%)' },
  },
  '@keyframes brandLogoBreath': {
    '0%, 100%': {
      filter: 'drop-shadow(0 0 14px rgba(214, 179, 106, 0.35))',
      transform: 'scale(1)',
    },
    '50%': {
      filter: 'drop-shadow(0 0 28px rgba(214, 179, 106, 0.55))',
      transform: 'scale(1.03)',
    },
  },
};

function BrandFillLetters({
  textSx,
  reduced,
}: {
  textSx: Record<string, unknown>;
  reduced: boolean;
}) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: 'inline-flex',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        ...textSx,
      }}
    >
      {LETTERS.map((letter, index) => (
        <Box
          key={`${letter}-${index}`}
          component="span"
          sx={{
            position: 'relative',
            display: 'inline-block',
            color: 'rgba(214, 179, 106, 0.1)',
          }}
        >
          {letter}
          <Box
            component="span"
            sx={{
              position: 'absolute',
              inset: 0,
              background: GOLD_FILL,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              clipPath: reduced ? 'inset(0 0 0 0 round 1px)' : undefined,
              animation: reduced
                ? 'none'
                : `brandLetterFill 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
              animationDelay: reduced ? undefined : `${index * 0.11}s`,
              filter: 'drop-shadow(0 0 10px rgba(214, 179, 106, 0.35))',
            }}
          >
            {letter}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function BrandFillLoader({
  variant = 'fullscreen',
  'aria-label': ariaLabel = 'Loading',
  scrollIntoView = false,
  scrollToken,
  id,
}: Props) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const isFullscreen = variant === 'fullscreen';
  const isCompact = variant === 'compact';
  const isMinimalShell = variant === 'overlay' || variant === 'pdp';
  const showFullBackdrop = isFullscreen;

  useEffect(() => {
    if (!scrollIntoView || !rootRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({
        behavior: reduced ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollIntoView, scrollToken, reduced]);

  const minHeight = isFullscreen
    ? '100dvh'
    : isMinimalShell
      ? 'auto'
      : isCompact
        ? 160
        : scrollIntoView
          ? { xs: '50vh', sm: '45vh' }
          : { xs: 240, sm: 280 };

  const logoHeight = isFullscreen
    ? { xs: 80, sm: 96, md: 108 }
    : isCompact
      ? { xs: 44, sm: 48 }
      : { xs: 56, sm: 72, md: 80 };

  const textSx = {
    fontFamily: shopSurface.logo.fontFamily,
    fontWeight: shopSurface.logo.fontWeight,
    fontSize: isFullscreen
      ? { xs: '1.35rem', sm: '1.85rem', md: '2.35rem', lg: '2.75rem' }
      : isCompact
        ? { xs: '0.95rem', sm: '1.05rem' }
        : scrollIntoView
          ? { xs: '1.15rem', sm: '1.45rem', md: '1.75rem' }
          : { xs: '1.05rem', sm: '1.25rem', md: '1.45rem' },
    letterSpacing: isFullscreen
      ? { xs: '0.22em', sm: '0.28em', md: '0.34em' }
      : isCompact
        ? { xs: '0.18em', sm: '0.22em' }
        : scrollIntoView
          ? { xs: '0.2em', sm: '0.26em', md: '0.3em' }
          : { xs: '0.18em', sm: '0.24em', md: '0.28em' },
    lineHeight: shopSurface.logo.lineHeight,
    textTransform: shopSurface.logo.textTransform,
    fontStyle: 'normal',
  };

  return (
    <Box
      ref={rootRef}
      id={id}
      className="brand-fill-loader"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 1400 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        width: '100%',
        overflow: 'hidden',
        isolation: 'isolate',
        scrollMarginTop: scrollIntoView ? { xs: 72, sm: 88 } : undefined,
        ...motionKeyframes,
      }}
    >
      <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {BRAND_TEXT}
      </Box>

      {showFullBackdrop && (
        <>
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 120% 80% at 50% 0%, rgba(214, 179, 106, 0.1) 0%, transparent 55%), linear-gradient(165deg, #050508 0%, #0a0812 45%, #08060e 100%)',
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: '-20%',
              background:
                'radial-gradient(circle at 30% 40%, rgba(214, 179, 106, 0.18) 0%, transparent 42%), radial-gradient(circle at 70% 60%, rgba(214, 179, 106, 0.1) 0%, transparent 40%)',
              filter: 'blur(48px)',
              animation: reduced ? 'none' : 'brandOrbPulse 6s ease-in-out infinite',
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(28px) saturate(140%)',
              WebkitBackdropFilter: 'blur(28px) saturate(140%)',
              backgroundColor: 'rgba(5, 5, 8, 0.55)',
            }}
          />
        </>
      )}

      <Box
        component={motion.div}
        initial={reduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isCompact ? { xs: 1.75, sm: 2 } : { xs: 2.75, sm: 3.25 },
          px: isCompact ? { xs: 2, sm: 2.5 } : { xs: 3, sm: 4 },
          py: isCompact ? { xs: 2.25, sm: 2.75 } : { xs: 3.5, sm: 4.5 },
          borderRadius: isCompact ? 2 : 3,
          background: isMinimalShell
            ? 'transparent'
            : 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
          border: isMinimalShell ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isMinimalShell
            ? 'none'
            : isCompact
              ? '0 12px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: isMinimalShell ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isMinimalShell ? 'none' : 'blur(20px)',
          maxWidth: isCompact ? 360 : 'min(94vw, 720px)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              width: { xs: 130, sm: 150 },
              height: { xs: 130, sm: 150 },
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(214, 179, 106, 0.22) 0%, transparent 70%)',
              filter: 'blur(12px)',
            }}
          />
          <Box
            component={motion.img}
            src={brandLogoUrl}
            alt=""
            aria-hidden
            animate={
              reduced
                ? undefined
                : {
                    y: [0, -4, 0],
                  }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
            }
            sx={{
              position: 'relative',
              height: logoHeight,
              width: 'auto',
              maxWidth: { xs: 220, sm: 260 },
              objectFit: 'contain',
              display: 'block',
              animation: reduced ? 'none' : 'brandLogoBreath 3.5s ease-in-out infinite',
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            overflow: 'hidden',
            px: 0.5,
          }}
        >
          <BrandFillLetters textSx={textSx} reduced={reduced} />
        </Box>
      </Box>
    </Box>
  );
}
