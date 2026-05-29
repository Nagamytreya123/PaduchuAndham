import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconGoogle, IconInfoOutlined } from '../icons';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { authSurface as S } from '../constants/authSurface';
import { useReducedMotion } from '../hooks/useReducedMotion';
import ambientVideoUrl from '../assets/auth-ambient.mp4?url';

function useTabFromMode(searchParams: URLSearchParams) {
  return searchParams.get('mode') === 'signup' ? 1 : 0;
}

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const textFieldAuthSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: S.glass.inputBg,
    borderRadius: 1.5,
    color: S.text.primary,
    fontFamily: S.font.body,
    fontSize: '1rem',
    boxShadow: S.input.shadowInset,
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '& fieldset': { borderColor: S.input.border, borderWidth: 1 },
    '&:hover fieldset': { borderColor: S.input.borderHover },
    '&.Mui-focused': {
      boxShadow: `0 0 8px ${S.accentFocusRing}, ${S.input.shadowInset}`,
    },
    '&.Mui-focused fieldset': { borderColor: S.input.borderFocus, borderWidth: 1 },
    '&.Mui-disabled': {
      bgcolor: 'rgba(21, 19, 16, 0.25)',
      '& fieldset': { borderColor: 'rgba(150, 144, 131, 0.2)' },
    },
    '&.Mui-error fieldset': { borderColor: S.error },
  },
  '& .MuiInputBase-input': { color: S.text.primary },
  '& .MuiInputLabel-root': { color: S.text.muted, fontFamily: S.font.body },
  '& .MuiInputLabel-root.Mui-focused': { color: S.text.primary },
  '& .MuiFormHelperText-root': { color: S.text.faint, mt: 0.75, fontFamily: S.font.body },
};

const authCardSx = {
  bgcolor: S.glass.cardBg,
  borderRadius: 4,
  backdropFilter: S.glass.backdrop,
  WebkitBackdropFilter: S.glass.backdrop,
  border: `1px solid ${S.glass.border}`,
  boxShadow: `${S.glass.panelShadow}, ${S.glass.innerGlow}`,
} as const;

const authAmbientVideoSrc = `${ambientVideoUrl}#t=0.001`;

/** Main body loops on login/signup; last segment plays once after successful auth. */
const AUTH_VIDEO_OUTRO_SEC = 2;
const AUTH_COLLAPSE_MS = 480;

type AuthExitStage = 'idle' | 'collapsing' | 'outro';

export function LoginPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const celebrate = searchParams.get('celebrate') === '1';
  const err = searchParams.get('error');
  const tabFromUrl = useTabFromMode(searchParams);
  const [tab, setTab] = useState(tabFromUrl);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [authExitStage, setAuthExitStage] = useState<AuthExitStage>('idle');
  const [celebrateSynced, setCelebrateSynced] = useState(false);
  const authExitStageRef = useRef(authExitStage);
  authExitStageRef.current = authExitStage;
  const videoPhaseRef = useRef<'intro' | 'outro'>('intro');
  const outroNavOnceRef = useRef(false);

  useEffect(() => {
    setTab(useTabFromMode(searchParams));
  }, [searchParams]);

  const redirectTarget = useMemo(() => {
    const raw = searchParams.get('redirect');
    if (raw?.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/account';
  }, [searchParams]);

  const beginOutroThenNavigate = useCallback(() => {
    if (outroNavOnceRef.current) return;
    const v = videoRef.current;
    const target = user?.role === 'admin' ? '/admin' : redirectTarget;
    if (reducedMotion || !v) {
      outroNavOnceRef.current = true;
      navigate(target, { replace: true });
      return;
    }
    outroNavOnceRef.current = true;
    videoPhaseRef.current = 'outro';
    v.loop = false;

    const finish = () => {
      navigate(target, { replace: true });
    };

    const go = () => {
      const dur = v.duration;
      const t0 = Math.max(0, dur - AUTH_VIDEO_OUTRO_SEC);
      if (!Number.isFinite(dur) || dur <= AUTH_VIDEO_OUTRO_SEC + 0.08) {
        finish();
        return;
      }
      const handleEnded = () => {
        v.removeEventListener('ended', handleEnded);
        finish();
      };
      v.addEventListener('ended', handleEnded);
      try {
        v.currentTime = t0;
      } catch {
        finish();
        return;
      }
      void v.play().catch(() => finish());
    };

    if (v.readyState >= 1) go();
    else v.addEventListener('loadedmetadata', go, { once: true });
  }, [navigate, redirectTarget, reducedMotion, user]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) return;
    el.defaultMuted = true;
    el.muted = true;
    el.loop = false;
    videoPhaseRef.current = 'intro';
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
    const p = el.play();
    if (p !== undefined) void p.catch(() => {});
  }, [reducedMotion, loading]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reducedMotion) return;
    const onTime = () => {
      if (videoPhaseRef.current !== 'intro') return;
      if (authExitStageRef.current !== 'idle') return;
      const dur = v.duration;
      if (!Number.isFinite(dur) || dur <= AUTH_VIDEO_OUTRO_SEC + 0.08) return;
      const loopEnd = dur - AUTH_VIDEO_OUTRO_SEC;
      if (v.currentTime >= loopEnd - 0.06) {
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [reducedMotion]);

  useEffect(() => {
    if (!celebrate) {
      setCelebrateSynced(false);
      return;
    }
    void (async () => {
      await refresh();
      setCelebrateSynced(true);
    })();
  }, [celebrate, refresh]);

  useEffect(() => {
    if (loading || !celebrate || !celebrateSynced) return;
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [loading, celebrate, celebrateSynced, user, navigate]);

  useEffect(() => {
    if (!celebrate || !user || loading || reducedMotion) return;
    if (outroNavOnceRef.current) return;
    setAuthExitStage('outro');
    requestAnimationFrame(() => beginOutroThenNavigate());
  }, [celebrate, user, loading, reducedMotion, beginOutroThenNavigate]);

  const emailInvalid = emailTouched && email.trim().length > 0 && !emailOk(email);

  function setModeInUrl(nextTab: number) {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 1) next.set('mode', 'signup');
    else next.delete('mode');
    setSearchParams(next, { replace: true });
  }

  const panelMotionInner = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0.92 },
        animate: { opacity: 1 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
      };

  const tabFade = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
        exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } },
      };

  if (loading) {
    return (
      <Box
        component="main"
        sx={{
          position: 'relative',
          minHeight: 'calc(100dvh - 56px)',
          overflowX: 'hidden',
          bgcolor: S.stageBg,
        }}
      >
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', bgcolor: S.stageBg }}>
          <video
            ref={videoRef}
            src={authAmbientVideoSrc}
            muted
            playsInline
            preload="metadata"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              transform: 'translateZ(0)',
            }}
          />
          <Box sx={{ position: 'absolute', inset: 0, background: S.scrim, pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', inset: 0, background: S.scrimOverVideo, pointerEvents: 'none' }} />
        </Box>
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ position: 'relative', zIndex: 2, minHeight: 'calc(100dvh - 56px)' }}
        >
          <CircularProgress sx={{ color: S.accent }} aria-label="Loading" />
        </Stack>
      </Box>
    );
  }

  if (user && !celebrate && authExitStage === 'idle') {
    return <Navigate to={user.role === 'admin' ? '/admin' : redirectTarget} replace />;
  }

  const showAuthChrome = !user || authExitStage === 'collapsing';

  async function finishAuthSuccess() {
    await refresh();
    await new Promise((r) => setTimeout(r, AUTH_COLLAPSE_MS));
    setAuthExitStage('outro');
    outroNavOnceRef.current = false;
    beginOutroThenNavigate();
  }

  async function emailSignIn() {
    setBusy(true);
    setFormErr(null);
    try {
      setAuthExitStage('collapsing');
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      await finishAuthSuccess();
    } catch (e) {
      setAuthExitStage('idle');
      setFormErr(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function emailSignUp() {
    setBusy(true);
    setFormErr(null);
    try {
      setAuthExitStage('collapsing');
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: displayName.trim() || undefined,
        }),
      });
      await finishAuthSuccess();
    } catch (e) {
      setAuthExitStage('idle');
      setFormErr(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  const whySignInTitle =
    tab === 0
      ? 'Sign in with Google or the email you used when you joined.'
      : 'Create an account with Google or your email and name.';

  return (
    <Box
      component="main"
      sx={{
        position: 'relative',
        minHeight: 'calc(100dvh - 56px)',
        overflowX: 'hidden',
        overflowY: 'visible',
        bgcolor: S.stageBg,
      }}
    >
      {/* Layer 0: ambient loop — native <video> for reliable autoplay across browsers */}
      <Box
        data-auth-ambient
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          overflow: 'hidden',
          bgcolor: S.stageBg,
          minHeight: '100%',
        }}
      >
        <video
          ref={videoRef}
          src={authAmbientVideoSrc}
          autoPlay={!reducedMotion}
          muted
          loop={false}
          playsInline
          preload="auto"
          disablePictureInPicture
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
            transform: 'translateZ(0)',
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: S.scrim, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: S.scrimOverVideo, pointerEvents: 'none' }} />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: { xs: 420, md: 1120 },
          mx: 'auto',
          px: { xs: 2, sm: 2.5 },
          py: { xs: 2, md: 5 },
          bgcolor: 'transparent',
        }}
      >
        {showAuthChrome && (
          <motion.div
            initial={false}
            animate={
              authExitStage === 'collapsing'
                ? { opacity: 0, y: 16, scale: 0.97, filter: 'blur(12px)' }
                : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
            }
            transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          >
        <Grid container spacing={{ xs: 2, md: 3 }} alignItems="stretch" sx={{ bgcolor: 'transparent' }}>
          {/* Form first in DOM: mobile-first layout + focus order aligns with visual */}
          <Grid
            item
            xs={12}
            md={6}
            sx={{
              order: { xs: 1, md: 2 },
              minWidth: 0,
              bgcolor: 'transparent',
            }}
          >
              <Box
                role="region"
                aria-label="Account sign in"
                sx={{
                  p: { xs: 3, sm: 3.5, md: 4 },
                  height: '100%',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  ...authCardSx,
                }}
              >
                <motion.div {...panelMotionInner}>
                  <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      display: { xs: 'block', md: 'none' },
                      textAlign: 'center',
                      fontFamily: S.font.display,
                      fontWeight: 700,
                      fontSize: { xs: '2rem', sm: '2.25rem' },
                      lineHeight: 1.2,
                      color: S.text.display,
                      letterSpacing: '-0.01em',
                      textShadow: S.accentGlow,
                      mb: 2.5,
                    }}
                  >
                    {tab === 0 ? 'Welcome back' : 'Join the lookbook'}
                  </Typography>
                  <Tabs
                    value={tab}
                    onChange={(_, v) => {
                      setTab(v);
                      setFormErr(null);
                      setEmailTouched(false);
                      setModeInUrl(v);
                    }}
                    variant="fullWidth"
                    sx={{
                      mb: 2.5,
                      minHeight: 44,
                      bgcolor: 'transparent',
                      borderBottom: `1px solid ${S.glass.borderDeep}`,
                      '& .MuiTabs-flexContainer': { gap: 0 },
                      '& .MuiTab-root': {
                        py: 1.25,
                        minHeight: 44,
                        fontFamily: S.font.body,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: S.text.faint,
                        transition: reducedMotion ? undefined : 'color 0.25s ease',
                        '&:hover': { color: S.text.muted },
                        '&.Mui-selected': {
                          color: S.text.display,
                        },
                      },
                      '& .MuiTabs-indicator': {
                        height: 2,
                        bgcolor: S.accent,
                        boxShadow: S.accentGlow,
                      },
                    }}
                  >
                    <Tab label="Sign in" id="auth-tab-0" aria-controls="auth-panel-0" disableRipple />
                    <Tab label="Sign up" id="auth-tab-1" aria-controls="auth-panel-1" disableRipple />
                  </Tabs>

                  {err === 'auth' && (
                    <Alert
                      severity="warning"
                      sx={{
                        mb: 2,
                        borderRadius: 1.5,
                        color: S.text.primary,
                        bgcolor: S.warningBg,
                        border: `1px solid ${S.glass.borderDeep}`,
                        fontFamily: S.font.body,
                      }}
                    >
                      Google sign-in was cancelled or failed.
                    </Alert>
                  )}
                  {err === 'user' && (
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2,
                        borderRadius: 1.5,
                        bgcolor: S.errorBg,
                        color: S.error,
                        border: `1px solid rgba(255, 180, 171, 0.25)`,
                        fontFamily: S.font.body,
                      }}
                    >
                      Could not load your profile.
                    </Alert>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      role="tabpanel"
                      id={`auth-panel-${tab}`}
                      aria-labelledby={`auth-tab-${tab}`}
                      {...tabFade}
                    >
                      <Stack spacing={2}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: S.text.muted,
                            fontFamily: S.font.body,
                            fontSize: '1rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {tab === 0
                            ? 'Access your orders and saved details in one calm place.'
                            : 'Start with Google—we prepare your profile on first visit.'}
                        </Typography>

                        <Button
                          variant="outlined"
                          size="large"
                          startIcon={<IconGoogle />}
                          component="a"
                          href="/api/auth/google"
                          fullWidth
                          sx={{
                            py: 1.35,
                            bgcolor: 'rgba(21, 19, 16, 0.4)',
                            borderColor: S.glass.borderDeep,
                            color: S.text.primary,
                            fontFamily: S.font.body,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            letterSpacing: '0.04em',
                            textTransform: 'none',
                            '&:hover': {
                              bgcolor: 'rgba(33, 31, 28, 0.55)',
                              borderColor: S.glass.border,
                            },
                            '&:focus-visible': {
                              outline: `2px solid ${S.accentFocusRing}`,
                              outlineOffset: 3,
                            },
                          }}
                        >
                          {tab === 0 ? 'Continue with Google' : 'Sign up with Google'}
                        </Button>

                        <Stack direction="row" alignItems="center" spacing={2} sx={{ py: 1 }}>
                          <Divider sx={{ flex: 1, borderColor: S.glass.borderDeep }} />
                          <Typography
                            variant="caption"
                            sx={{
                              color: S.text.faint,
                              fontFamily: S.font.body,
                              letterSpacing: '0.12em',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                            }}
                          >
                            OR
                          </Typography>
                          <Divider sx={{ flex: 1, borderColor: S.glass.borderDeep }} />
                        </Stack>

                        <Stack spacing={2} component="form" onSubmit={(e) => e.preventDefault()}>
                          {tab === 1 && (
                            <TextField
                              label="Your name"
                              variant="outlined"
                              fullWidth
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              sx={textFieldAuthSx}
                              autoComplete="name"
                            />
                          )}
                          <TextField
                            label="Email"
                            variant="outlined"
                            fullWidth
                            required
                            type="email"
                            value={email}
                            error={emailInvalid}
                            helperText={emailInvalid ? 'Enter a valid email address.' : undefined}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            sx={textFieldAuthSx}
                            autoComplete="email"
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={busy || !email.trim() || !emailOk(email)}
                            onClick={() => void (tab === 0 ? emailSignIn() : emailSignUp())}
                            fullWidth
                            sx={{
                              py: 1.35,
                              fontFamily: S.font.body,
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: S.text.onAccent,
                              background: `linear-gradient(90deg, ${S.accent} 0%, #E8D8A8 100%)`,
                              boxShadow: '0 4px 14px rgba(233, 195, 73, 0.2)',
                              '&:hover': {
                                background: `linear-gradient(90deg, ${S.accentHover} 0%, #D5C697 100%)`,
                              },
                              '&:focus-visible': {
                                outline: `2px solid ${S.accentFocusRing}`,
                                outlineOffset: 3,
                              },
                              '&.Mui-disabled': {
                                color: 'rgba(21, 19, 16, 0.38)',
                                background: 'rgba(150, 144, 131, 0.35)',
                              },
                            }}
                          >
                            {tab === 0 ? 'Sign in' : 'Create account'}
                          </Button>
                        </Stack>

                        {formErr && (
                          <Alert
                            severity="error"
                            sx={{
                              borderRadius: 1.5,
                              bgcolor: S.errorBg,
                              color: S.error,
                              fontFamily: S.font.body,
                              border: '1px solid rgba(255, 180, 171, 0.25)',
                            }}
                          >
                            {formErr}
                          </Alert>
                        )}

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          justifyContent="space-between"
                          sx={{ pt: 1, gap: 1 }}
                        >
                          {tab === 0 ? (
                            <Tooltip title="Use the same email you signed up with, or the Google account linked to your orders.">
                              <Link
                                component="button"
                                type="button"
                                variant="body2"
                                underline="hover"
                                sx={{
                                  color: S.text.muted,
                                  fontFamily: S.font.body,
                                  fontSize: '1rem',
                                  textAlign: 'left',
                                  cursor: 'help',
                                  fontWeight: 500,
                                  '&:hover': { color: S.text.display },
                                  '&:focus-visible': { outline: `2px solid ${S.accentFocusRing}`, outlineOffset: 2, borderRadius: 0.5 },
                                }}
                              >
                                Can’t access your account?
                              </Link>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" sx={{ color: S.text.muted, fontFamily: S.font.body }}>
                              By continuing you agree to our checkout and delivery terms.
                            </Typography>
                          )}
                          <Link
                            component={RouterLink}
                            to="/"
                            variant="body2"
                            underline="hover"
                            sx={{
                              color: S.text.muted,
                              fontFamily: S.font.body,
                              fontSize: '1rem',
                              fontWeight: 500,
                              '&:hover': { color: S.text.display },
                              '&:focus-visible': { outline: `2px solid ${S.accentFocusRing}`, outlineOffset: 2, borderRadius: 0.5 },
                            }}
                          >
                            ← Back to shop
                          </Link>
                        </Stack>
                      </Stack>
                    </motion.div>
                  </AnimatePresence>
                </Box>
                </motion.div>
              </Box>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
            sx={{
              order: { xs: 2, md: 1 },
              minWidth: 0,
              bgcolor: 'transparent',
              display: { xs: 'none', md: 'block' },
            }}
          >
              <Box
                sx={{
                  p: { md: 4, lg: 5 },
                  minHeight: { md: 'min(72vh, 560px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  ...authCardSx,
                }}
              >
                <motion.div {...panelMotionInner}>
                <Typography
                  variant="caption"
                  sx={{
                    mb: 2,
                    display: 'block',
                    color: S.text.faint,
                    fontFamily: S.font.body,
                    letterSpacing: '0.2em',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  Paduchuandham
                </Typography>

                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      flex: 1,
                      color: S.text.display,
                      fontFamily: S.font.display,
                      fontWeight: 700,
                      fontSize: { md: '2.75rem', lg: '3.25rem' },
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                      textShadow: S.accentGlow,
                    }}
                  >
                    {tab === 0 ? 'Welcome back' : 'Join the lookbook'}
                  </Typography>
                  <Tooltip title={whySignInTitle} describeChild placement="top" arrow>
                    <IconButton
                      size="small"
                      aria-label="Why sign in?"
                      sx={{
                        mt: 0.5,
                        color: S.text.muted,
                        border: `1px solid ${S.glass.borderDeep}`,
                        borderRadius: 1,
                        '&:hover': { bgcolor: S.accentSoftBg, color: S.text.display },
                        '&:focus-visible': {
                          outline: `2px solid ${S.accentFocusRing}`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <IconInfoOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Typography
                  variant="body1"
                  sx={{
                    color: S.text.muted,
                    fontFamily: S.font.body,
                    fontSize: '1.125rem',
                    maxWidth: 420,
                    lineHeight: 1.65,
                  }}
                >
                  {tab === 0
                    ? 'Quiet luxury shopping: fewer steps, clearer order status, and a checkout that remembers you.'
                    : 'Create your space in the collection—curated picks, calm updates, no clutter.'}
                </Typography>
                </motion.div>
              </Box>
          </Grid>
        </Grid>
          </motion.div>
        )}
      </Box>
    </Box>
  );
}
