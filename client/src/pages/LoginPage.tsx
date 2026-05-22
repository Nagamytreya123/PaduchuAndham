import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconGoogle, IconInfoOutlined } from '../icons';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
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

const textFieldLightSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: S.glass.inputBg,
    borderRadius: 1,
    boxShadow: S.input.shadowInset,
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
    '& fieldset': {
      borderColor: S.input.borderOnGlass,
      borderWidth: 1,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    '&:hover fieldset': { borderColor: S.input.borderHover },
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${S.accentFocusRing}, ${S.input.shadowInset}`,
    },
    '&.Mui-focused fieldset': {
      borderColor: S.input.borderFocus,
      borderWidth: 1,
    },
    '&.Mui-disabled': {
      bgcolor: 'rgba(26,24,20,0.04)',
      '& fieldset': { borderColor: 'rgba(26,24,20,0.12)' },
    },
    '&.Mui-error fieldset': { borderColor: S.error },
  },
  '& .MuiInputLabel-root': { color: S.text.muted },
  '& .MuiInputLabel-root.Mui-focused': { color: S.text.primary },
  '& .MuiFormHelperText-root': { color: S.text.muted, mt: 0.75 },
};

const glassPanelSx = {
  backdropFilter: S.glass.backdrop,
  WebkitBackdropFilter: S.glass.backdrop,
  border: `1px solid ${S.glass.border}`,
  boxShadow: `${S.glass.panelShadow}, ${S.glass.innerGlow}`,
} as const;

const authAmbientVideoSrc = `${ambientVideoUrl}#t=0.001`;

/** First segment loops on the auth form; remainder plays once after successful auth. */
const AUTH_VIDEO_INTRO_SEC = 2;
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

  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');
  const [busy, setBusy] = useState(false);
  const [devErr, setDevErr] = useState<string | null>(null);
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
      const t0 = AUTH_VIDEO_INTRO_SEC;
      if (!Number.isFinite(dur) || dur <= t0 + 0.08) {
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
      if (v.currentTime >= AUTH_VIDEO_INTRO_SEC - 0.06) {
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

  const emailInvalid = emailTouched && devEmail.trim().length > 0 && !emailOk(devEmail);

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

  async function devLogin() {
    setBusy(true);
    setDevErr(null);
    try {
      setAuthExitStage('collapsing');
      await apiFetch('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email: devEmail.trim().toLowerCase() }),
      });
      await refresh();
      await new Promise((r) => setTimeout(r, AUTH_COLLAPSE_MS));
      setAuthExitStage('outro');
      outroNavOnceRef.current = false;
      beginOutroThenNavigate();
    } catch (e) {
      setAuthExitStage('idle');
      setDevErr(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function devSignup() {
    setBusy(true);
    setDevErr(null);
    try {
      setAuthExitStage('collapsing');
      await apiFetch('/api/auth/dev-signup', {
        method: 'POST',
        body: JSON.stringify({
          email: devEmail.trim().toLowerCase(),
          name: devName.trim() || undefined,
        }),
      });
      await refresh();
      await new Promise((r) => setTimeout(r, AUTH_COLLAPSE_MS));
      setAuthExitStage('outro');
      outroNavOnceRef.current = false;
      beginOutroThenNavigate();
    } catch (e) {
      setAuthExitStage('idle');
      setDevErr(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  const whySignInTitle =
    tab === 0
      ? 'Sign in to track orders and finish checkout securely. Google is the default path; development offers email shortcuts after seeding.'
      : 'We use Google for production sign-up. Local development can create users without OAuth when enabled.';

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
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1120,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: { xs: 3, md: 5 },
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
                  bgcolor: S.glass.formBg,
                  borderRadius: 2,
                  p: { xs: 2.5, sm: 3, md: 4 },
                  height: '100%',
                  backgroundImage: 'none',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  ...glassPanelSx,
                }}
              >
                <motion.div {...panelMotionInner}>
                  <Box sx={{ maxWidth: 400, mx: 'auto' }}>
                  <Tabs
                    value={tab}
                    onChange={(_, v) => {
                      setTab(v);
                      setDevErr(null);
                      setEmailTouched(false);
                      setModeInUrl(v);
                    }}
                    variant="fullWidth"
                    sx={{
                      mb: 2,
                      minHeight: 48,
                      bgcolor: 'transparent',
                      '& .MuiTabs-flexContainer': { gap: 0.5 },
                      '& .MuiTab-root': {
                        py: 1.25,
                        minHeight: 48,
                        borderRadius: 1,
                        color: S.text.muted,
                        fontWeight: 500,
                        transition: reducedMotion ? undefined : 'background-color 0.2s ease, color 0.2s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                        '&.Mui-selected': {
                          color: S.text.primary,
                          fontWeight: 600,
                          bgcolor: 'rgba(255, 255, 255, 0.28)',
                        },
                      },
                      '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                        bgcolor: S.accent,
                      },
                    }}
                  >
                    <Tab label="Sign in" id="auth-tab-0" aria-controls="auth-panel-0" disableRipple />
                    <Tab label="Sign up" id="auth-tab-1" aria-controls="auth-panel-1" disableRipple />
                  </Tabs>

                  {err === 'auth' && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 1, color: S.text.primary, bgcolor: 'rgba(184,146,46,0.12)' }}>
                      Google sign-in was cancelled or failed.
                    </Alert>
                  )}
                  {err === 'user' && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 1, bgcolor: S.errorBg, color: S.error }}>
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
                            lineHeight: 1.6,
                            textShadow: '0 0 1px rgba(255,255,255,0.9), 0 1px 10px rgba(255,255,255,0.65)',
                          }}
                        >
                          {tab === 0
                            ? 'Access your orders and saved details in one calm place.'
                            : 'Start with Google—we prepare your profile on first visit.'}
                        </Typography>

                        <Button
                          variant="contained"
                          size="large"
                          startIcon={<IconGoogle />}
                          component="a"
                          href="/api/auth/google"
                          fullWidth
                          sx={{
                            py: 1.25,
                            bgcolor: S.accent,
                            color: S.text.onAccent,
                            fontWeight: 600,
                            boxShadow: 'none',
                            '&:hover': { bgcolor: S.accentHover, boxShadow: 'none' },
                            '&:focus-visible': {
                              outline: `2px solid ${S.accent}`,
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
                              color: S.text.muted,
                              letterSpacing: '0.14em',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          >
                            OR
                          </Typography>
                          <Divider sx={{ flex: 1, borderColor: S.glass.borderDeep }} />
                        </Stack>

                        <Typography
                          variant="subtitle2"
                          component="h2"
                          sx={{
                            color: S.text.primary,
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            textShadow: '0 0 1px rgba(255,255,255,0.85), 0 1px 8px rgba(255,255,255,0.55)',
                          }}
                        >
                          {tab === 0 ? 'Returning customer' : 'Development email'}
                        </Typography>

                        {import.meta.env.DEV && (
                          <Box
                            component="aside"
                            aria-label="Development sign-in"
                            sx={{
                              border: `1px dashed ${S.input.borderOnGlass}`,
                              borderRadius: 1,
                              bgcolor: S.glass.nestedBg,
                              backdropFilter: S.glass.nestedBackdrop,
                              WebkitBackdropFilter: S.glass.nestedBackdrop,
                              px: 1.5,
                              py: 1.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              component="p"
                              sx={{
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: '0.72rem',
                                color: S.text.muted,
                                letterSpacing: 0,
                                textTransform: 'none',
                                lineHeight: 1.5,
                                mb: 1.5,
                              }}
                            >
                              {tab === 0
                                ? 'Run `npm run seed`, then use a seeded email below.'
                                : 'Creates a local user (fails if email exists). No password in this path.'}
                            </Typography>
                            {tab === 1 && import.meta.env.DEV && (
                              <Typography
                                variant="caption"
                                display="block"
                                sx={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  fontSize: '0.68rem',
                                  color: S.text.muted,
                                  mb: 1.5,
                                  opacity: 0.9,
                                }}
                              >
                                Example validation (reference): “Password needs 8+ characters, a number, and a symbol.”
                              </Typography>
                            )}
                            <Stack spacing={2}>
                              {tab === 1 && (
                                <TextField
                                  label="Display name"
                                  variant="outlined"
                                  fullWidth
                                  value={devName}
                                  onChange={(e) => setDevName(e.target.value)}
                                  sx={textFieldLightSx}
                                />
                              )}
                              <TextField
                                label="Email"
                                variant="outlined"
                                fullWidth
                                required
                                type="email"
                                value={devEmail}
                                error={emailInvalid}
                                helperText={emailInvalid ? 'Enter a valid email address.' : undefined}
                                onChange={(e) => setDevEmail(e.target.value)}
                                onBlur={() => setEmailTouched(true)}
                                sx={textFieldLightSx}
                              />
                              <Button
                                variant="outlined"
                                disabled={busy || !devEmail.trim() || !emailOk(devEmail)}
                                onClick={() => void (tab === 0 ? devLogin() : devSignup())}
                                sx={{
                                  borderColor: S.input.border,
                                  color: S.text.primary,
                                  fontWeight: 600,
                                  '&:hover': { borderColor: S.accent, bgcolor: S.accentSoftBg },
                                  '&:focus-visible': {
                                    outline: `2px solid ${S.accentFocusRing}`,
                                    outlineOffset: 2,
                                  },
                                  '&.Mui-disabled': { borderColor: 'rgba(26,24,20,0.12)', color: 'rgba(26,24,20,0.38)' },
                                }}
                              >
                                {tab === 0 ? 'Dev sign in' : 'Dev create account'}
                              </Button>
                            </Stack>
                          </Box>
                        )}

                        {!import.meta.env.DEV && (
                          <Typography variant="body2" sx={{ color: S.text.muted }}>
                            {tab === 0
                              ? 'Google sign-in is the supported path for returning customers.'
                              : 'Use Google above to create your production account.'}
                          </Typography>
                        )}

                        {devErr && (
                          <Alert severity="error" sx={{ borderRadius: 1, bgcolor: S.errorBg, color: S.error }}>
                            {devErr}
                          </Alert>
                        )}

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          justifyContent="space-between"
                          sx={{ pt: 1, gap: 1 }}
                        >
                          {tab === 0 ? (
                            <Tooltip title="Accounts are tied to Google. Use the same Google account you checked out with.">
                              <Link
                                component="button"
                                type="button"
                                variant="body2"
                                underline="hover"
                                sx={{
                                  color: S.text.muted,
                                  textAlign: 'left',
                                  cursor: 'help',
                                  fontWeight: 500,
                                  '&:focus-visible': { outline: `2px solid ${S.accentFocusRing}`, outlineOffset: 2, borderRadius: 0.5 },
                                }}
                              >
                                Can’t access your account?
                              </Link>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" sx={{ color: S.text.muted }}>
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
                              fontWeight: 500,
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
            }}
          >
              <Box
                sx={{
                  bgcolor: S.glass.heroBg,
                  borderRadius: 2,
                  p: { xs: 3, sm: 4, md: 5 },
                  minHeight: { md: 'min(72vh, 560px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  backgroundImage: 'none',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  ...glassPanelSx,
                }}
              >
                <motion.div {...panelMotionInner}>
                <Typography
                  variant="caption"
                  sx={{
                    mb: 2,
                    display: 'block',
                    color: S.text.muted,
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    textShadow: '0 0 1px rgba(255,255,255,0.95), 0 1px 12px rgba(255,255,255,0.75)',
                  }}
                >
                  Paduchu Shop
                </Typography>

                <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      flex: 1,
                      color: S.text.primary,
                      fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
                      fontWeight: 400,
                      lineHeight: 1.15,
                      textShadow:
                        '0 0 1px rgba(255,255,255,1), 0 2px 20px rgba(255,255,255,0.75), 0 1px 3px rgba(255,255,255,0.95)',
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
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.45)', color: S.text.primary },
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
                    maxWidth: 420,
                    lineHeight: 1.65,
                    textShadow: '0 0 1px rgba(255,255,255,0.95), 0 1px 14px rgba(255,255,255,0.72), 0 1px 1px rgba(255,255,255,0.9)',
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

      {authExitStage !== 'idle' && (
        <Box
          component="aside"
          aria-live="polite"
          aria-atomic="true"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            px: 2,
            textAlign: 'center',
          }}
        >
          <motion.div
            key={authExitStage}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxWidth: 440 }}
          >
            <Box
              sx={{
                px: { xs: 2.5, sm: 3.25 },
                py: { xs: 2.25, sm: 2.75 },
                borderRadius: 2,
                bgcolor: 'rgba(18, 16, 14, 0.72)',
                border: '1px solid rgba(214, 179, 106, 0.28)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Cormorant Garamond", "Playfair Display", "Noto Serif", serif',
                  fontWeight: 500,
                  fontSize: { xs: '1.65rem', sm: '2rem' },
                  lineHeight: 1.25,
                  color: 'primary.main',
                  letterSpacing: '0.03em',
                  textShadow:
                    '0 0 1px rgba(15,15,16,0.55), 0 1px 2px rgba(15,15,16,0.65), 0 0 18px rgba(214,179,106,0.22)',
                  mb: 1.25,
                }}
              >
                {authExitStage === 'collapsing' ? 'Signing you in…' : 'Entering Paduchu Shop…'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(196, 176, 138, 0.98)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textShadow: '0 1px 2px rgba(15,15,16,0.85)',
                }}
              >
                {authExitStage === 'collapsing' ? 'Securing your session' : 'Opening your gallery'}
              </Typography>
            </Box>
          </motion.div>
        </Box>
      )}
    </Box>
  );
}
