import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { orderCompletionSurface as S } from '../../constants/orderCompletionSurface';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatInrFromPaise } from '../../utils/format';
import { PREMIUM_EASE } from '../../motion/variants';
import {
  playErrorTone,
  playSuccessChime,
  triggerSuccessHaptic,
} from '../../utils/orderCompletionSound';

export type OrderCompletionOutcome = 'processing' | 'success' | 'failure';

type Props = {
  outcome: OrderCompletionOutcome;
  orderNumber: string;
  amountPaise: number;
  estimatedDelivery: string;
  failureMessage?: string;
  onTrackOrder: () => void;
  onContinueShopping: () => void;
  onTryAgain: () => void;
  onContactSupport: () => void;
};

const spring = { type: 'spring' as const, stiffness: 260, damping: 22 };

function AmbientParticles({ success }: { success: boolean }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 280,
        y: (Math.random() - 0.5) * 280,
        delay: Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        tone: i % 2 === 0 ? S.gold : S.emerald,
      })),
    [],
  );
  if (!success) return null;
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            scale: [0, 1, 0.4],
            x: p.x,
            y: p.y,
          }}
          transition={{
            duration: 2.2,
            delay: 1.8 + p.delay,
            ease: PREMIUM_EASE,
          }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '38%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.tone,
            boxShadow: `0 0 12px ${p.tone}`,
          }}
        />
      ))}
    </Box>
  );
}

function LuxuryWatch({ active }: { active: boolean }) {
  return (
    <motion.svg
      width={88}
      height={88}
      viewBox="0 0 88 88"
      fill="none"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={
        active
          ? { opacity: 1, scale: 1, rotate: [0, 0, 0] }
          : { opacity: 0, scale: 0.6, transition: { duration: 0.35 } }
      }
    >
      <circle cx="44" cy="44" r="40" stroke="rgba(232,216,168,0.35)" strokeWidth="1.5" />
      <circle cx="44" cy="44" r="36" stroke="rgba(233,195,73,0.2)" strokeWidth="0.75" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1={44}
          y1={10}
          x2={44}
          y2={deg % 90 === 0 ? 14 : 12}
          stroke="rgba(232,216,168,0.4)"
          strokeWidth={deg % 90 === 0 ? 1.2 : 0.6}
          transform={`rotate(${deg} 44 44)`}
        />
      ))}
      <motion.g
        style={{ transformOrigin: '44px 44px' }}
        animate={active ? { rotate: [0, 720] } : {}}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <line x1="44" y1="44" x2="44" y2="22" stroke={S.gold} strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
      <line x1="44" y1="44" x2="58" y2="40" stroke="rgba(231,226,220,0.85)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="44" cy="44" r="3" fill={S.gold} />
    </motion.svg>
  );
}

function AnimatedCheckmark({ draw }: { draw: boolean }) {
  return (
    <motion.svg width={88} height={88} viewBox="0 0 88 88" fill="none">
      <motion.circle
        cx="44"
        cy="44"
        r="40"
        stroke="rgba(45,212,168,0.45)"
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={draw ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, ease: PREMIUM_EASE }}
      />
      <motion.path
        d="M28 46 L40 58 L62 32"
        stroke={S.emerald}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={draw ? { pathLength: 1 } : {}}
        transition={{ duration: 0.55, delay: 0.15, ease: PREMIUM_EASE }}
      />
    </motion.svg>
  );
}

function AnimatedWarning({ show }: { show: boolean }) {
  const controls = useAnimation();
  useEffect(() => {
    if (!show) return;
    void controls.start({
      x: [0, -4, 4, -3, 3, 0],
      transition: { duration: 0.45, ease: 'easeInOut' },
    });
  }, [show, controls]);

  return (
    <motion.svg width={88} height={88} viewBox="0 0 88 88" fill="none" animate={controls}>
      <motion.circle
        cx="44"
        cy="44"
        r="40"
        stroke="rgba(196,92,92,0.5)"
        strokeWidth="1.5"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={show ? { scale: 1, opacity: 1 } : {}}
        transition={spring}
      />
      <motion.path
        d="M44 28 L44 50"
        stroke={S.crimson}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={show ? { pathLength: 1 } : {}}
        transition={{ duration: 0.35, delay: 0.1 }}
      />
      <motion.circle
        cx="44"
        cy="58"
        r="2"
        fill={S.crimson}
        initial={{ scale: 0 }}
        animate={show ? { scale: 1 } : {}}
        transition={{ delay: 0.25, ...spring }}
      />
    </motion.svg>
  );
}

function ProcessingRing() {
  return (
    <Box sx={{ position: 'relative', width: 88, height: 88 }}>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(45, 212, 168, 0.2)',
          borderTopColor: S.emerald,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 12,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.04)',
          boxShadow: `0 0 40px ${S.emeraldGlow}`,
        }}
      />
    </Box>
  );
}

export function OrderCompletionExperience({
  outcome,
  orderNumber,
  amountPaise,
  estimatedDelivery,
  failureMessage,
  onTrackOrder,
  onContinueShopping,
  onTryAgain,
  onContactSupport,
}: Props) {
  const reduced = useReducedMotion();
  const isSuccess = outcome === 'success';
  const isFailure = outcome === 'failure';
  const isProcessing = outcome === 'processing';

  const [showWatch, setShowWatch] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [processingLine, setProcessingLine] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;
    const t = window.setInterval(() => setProcessingLine((n) => (n + 1) % 2), 2200);
    return () => clearInterval(t);
  }, [isProcessing]);

  useEffect(() => {
    if (isProcessing) {
      setShowWatch(false);
      setShowCheck(false);
      setShowWarning(false);
      setContentReady(false);
      return;
    }
    if (isFailure) {
      playErrorTone();
      if (reduced) {
        setShowWarning(true);
        setContentReady(true);
        return;
      }
      const t1 = window.setTimeout(() => setShowWarning(true), 200);
      const t2 = window.setTimeout(() => setContentReady(true), 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (isSuccess) {
      playSuccessChime();
      triggerSuccessHaptic();
      if (reduced) {
        setShowCheck(true);
        setContentReady(true);
        return;
      }
      setShowWatch(true);
      const t1 = window.setTimeout(() => {
        setShowWatch(false);
        setShowCheck(true);
      }, 1000);
      const t2 = window.setTimeout(() => setContentReady(true), 2400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isProcessing, isSuccess, isFailure, reduced]);

  const processingText =
    processingLine === 0 ? 'Confirming your order...' : 'Securing payment';

  const detailRows = [
    { label: 'Order number', value: `#${orderNumber.slice(-8).toUpperCase()}` },
    { label: 'Estimated delivery', value: estimatedDelivery },
    { label: 'Total amount', value: formatInrFromPaise(amountPaise) },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isFailure ? S.bgFailure : S.bg,
        overflow: 'hidden',
        px: 2,
      }}
    >
      <motion.div
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        animate={
          reduced
            ? {}
            : {
                background: isFailure
                  ? [
                      'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(196,92,92,0.12) 0%, transparent 70%)',
                      'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(196,92,92,0.18) 0%, transparent 70%)',
                    ]
                  : isSuccess
                    ? [
                        'radial-gradient(ellipse 55% 45% at 50% 32%, rgba(45,212,168,0.1) 0%, transparent 65%)',
                        'radial-gradient(ellipse 55% 45% at 50% 32%, rgba(233,195,73,0.14) 0%, transparent 65%)',
                      ]
                    : 'radial-gradient(ellipse 50% 40% at 50% 35%, rgba(45,212,168,0.08) 0%, transparent 70%)',
              }
        }
        transition={{ duration: 2.5, ease: PREMIUM_EASE }}
      />

      <AmbientParticles success={isSuccess && contentReady} />

      <Box
        component={motion.div}
        initial={{ opacity: 0, filter: reduced ? 'none' : 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: PREMIUM_EASE }}
        sx={{
          width: '100%',
          maxWidth: 440,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          animate={reduced ? {} : { y: [0, -6, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Box
            sx={{
              mx: 'auto',
              width: 120,
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              bgcolor: S.glass.bg,
              border: `1px solid ${S.glass.border}`,
              backdropFilter: S.glass.backdrop,
              WebkitBackdropFilter: S.glass.backdrop,
              boxShadow: isFailure
                ? `0 0 48px ${S.crimsonGlow}, ${S.glass.shadow}`
                : `0 0 48px ${S.emeraldGlow}, ${S.glass.shadow}`,
              mb: 3,
            }}
          >
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProcessingRing />
                </motion.div>
              )}
              {isSuccess && showWatch && !showCheck && (
                <motion.div key="watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <LuxuryWatch active />
                </motion.div>
              )}
              {isSuccess && showCheck && (
                <motion.div key="check" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}>
                  <AnimatedCheckmark draw />
                </motion.div>
              )}
              {isFailure && showWarning && (
                <motion.div key="warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AnimatedWarning show />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </motion.div>

        {isProcessing && (
          <motion.div key="proc-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Typography
              sx={{
                fontFamily: S.font.body,
                fontSize: '0.9375rem',
                color: S.text.muted,
                letterSpacing: '0.04em',
              }}
            >
              {processingText}
            </Typography>
          </motion.div>
        )}

        <AnimatePresence>
          {contentReady && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: PREMIUM_EASE }}
            >
              <Typography
                component="h1"
                sx={{
                  fontFamily: S.font.display,
                  fontSize: { xs: '2rem', sm: '2.35rem' },
                  fontWeight: 500,
                  color: S.text.display,
                  letterSpacing: '-0.02em',
                  mb: 1.5,
                }}
              >
                {isSuccess ? 'Order Confirmed' : 'Order Could Not Be Completed'}
              </Typography>

              <Typography
                sx={{
                  fontFamily: S.font.body,
                  fontSize: '1rem',
                  lineHeight: 1.65,
                  color: isFailure ? S.text.failure : S.text.muted,
                  mb: 3,
                  maxWidth: 380,
                  mx: 'auto',
                }}
              >
                {isSuccess
                  ? 'Your order has been successfully placed and is being prepared.'
                  : failureMessage ??
                    'We were unable to process your order at this time. No amount has been charged.'}
              </Typography>

              {isSuccess && (
                <Box
                  component={motion.div}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
                  }}
                  sx={{
                    bgcolor: S.glass.bg,
                    border: `1px solid ${S.glass.border}`,
                    backdropFilter: S.glass.backdrop,
                    WebkitBackdropFilter: S.glass.backdrop,
                    boxShadow: S.glass.shadow,
                    borderRadius: 2,
                    p: 2.5,
                    mb: 3,
                    textAlign: 'left',
                  }}
                >
                  {detailRows.map((row) => (
                    <motion.div
                      key={row.label}
                      variants={{
                        hidden: { opacity: 0, y: 14 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: PREMIUM_EASE } },
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                        sx={{ py: 1.25, borderBottom: '1px solid rgba(232,216,168,0.12)', '&:last-child': { border: 0 } }}
                      >
                        <Typography sx={{ fontFamily: S.font.body, fontSize: '0.75rem', color: S.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {row.label}
                        </Typography>
                        <Typography sx={{ fontFamily: S.font.body, fontSize: '0.9375rem', fontWeight: 600, color: S.text.primary }}>
                          {row.value}
                        </Typography>
                      </Stack>
                    </motion.div>
                  ))}
                </Box>
              )}

              <Stack spacing={1.5} component={motion.div} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.55, ease: PREMIUM_EASE }}>
                {isSuccess ? (
                  <>
                    <Button fullWidth variant="contained" onClick={onTrackOrder} sx={S.ctaPrimary}>
                      Track order
                    </Button>
                    <Button fullWidth variant="outlined" onClick={onContinueShopping} sx={S.ctaSecondary}>
                      Continue shopping
                    </Button>
                  </>
                ) : (
                  <>
                    <Button fullWidth variant="contained" onClick={onTryAgain} sx={{ ...S.ctaPrimary, bgcolor: S.crimson, color: '#fff4f4', '&:hover': { bgcolor: '#a84848' } }}>
                      Try again
                    </Button>
                    <Button fullWidth variant="outlined" onClick={onContactSupport} sx={S.ctaSecondary}>
                      Contact support
                    </Button>
                  </>
                )}
              </Stack>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
