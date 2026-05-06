import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { IconGoogle } from '../icons';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

function useTabFromMode(searchParams: URLSearchParams) {
  return searchParams.get('mode') === 'signup' ? 1 : 0;
}

export function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const err = searchParams.get('error');
  const tabFromUrl = useTabFromMode(searchParams);
  const [tab, setTab] = useState(tabFromUrl);

  const [devEmail, setDevEmail] = useState('');
  const [devName, setDevName] = useState('');
  const [busy, setBusy] = useState(false);
  const [devErr, setDevErr] = useState<string | null>(null);

  useEffect(() => {
    setTab(useTabFromMode(searchParams));
  }, [searchParams]);

  const redirectTarget = useMemo(() => {
    const raw = searchParams.get('redirect');
    if (raw?.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/account/orders';
  }, [searchParams]);

  function setModeInUrl(nextTab: number) {
    const next = new URLSearchParams(searchParams);
    if (nextTab === 1) next.set('mode', 'signup');
    else next.delete('mode');
    setSearchParams(next, { replace: true });
  }

  if (loading) {
    return (
      <Stack alignItems="center" py={10}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Stack>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : redirectTarget} replace />;
  }

  async function devLogin() {
    setBusy(true);
    setDevErr(null);
    try {
      await apiFetch('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email: devEmail.trim().toLowerCase() }),
      });
      await refresh();
      navigate(redirectTarget, { replace: true });
    } catch (e) {
      setDevErr(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function devSignup() {
    setBusy(true);
    setDevErr(null);
    try {
      await apiFetch('/api/auth/dev-signup', {
        method: 'POST',
        body: JSON.stringify({
          email: devEmail.trim().toLowerCase(),
          name: devName.trim() || undefined,
        }),
      });
      await refresh();
      navigate(redirectTarget, { replace: true });
    } catch (e) {
      setDevErr(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Grid container spacing={{ xs: 0, md: 6 }} alignItems="stretch">
      <Grid item xs={12} md={6} sx={{ mb: { xs: 4, md: 0 } }}>
        <Box
          sx={{
            bgcolor: '#f3f3f3',
            p: { xs: 3, sm: 4, md: 5 },
            minHeight: { md: 'min(70vh, 520px)' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Paduchu Shop
          </Typography>
          <Typography variant="h2" component="h1" sx={{ mb: 2 }}>
            {tab === 0 ? 'Welcome back' : 'Join the lookbook'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
            {tab === 0
              ? 'Sign in to view orders and continue checkout. We use a single, secure sign-in so your experience stays uncluttered.'
              : 'Create an account with Google—we set up your profile on first visit. Editorial shopping, minimal friction.'}
          </Typography>
          <Typography
            component={RouterLink}
            to="/"
            variant="body2"
            sx={{
              mt: 3,
              color: 'text.primary',
              textDecorationColor: 'currentColor',
              textUnderlineOffset: 6,
              fontWeight: 600,
              alignSelf: 'flex-start',
            }}
          >
            ← Back to shop
          </Typography>
        </Box>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#ffffff',
            p: { xs: 0, sm: 1, md: 0 },
            height: '100%',
          }}
        >
          <Box sx={{ maxWidth: 400, mx: { xs: 0, sm: 'auto' }, py: { xs: 0, md: 2 } }}>
            <Tabs
              value={tab}
              onChange={(_, v) => {
                setTab(v);
                setDevErr(null);
                setModeInUrl(v);
              }}
              variant="fullWidth"
              sx={{
                mb: 3,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { py: 1.5 },
              }}
            >
              <Tab label="Sign in" id="auth-tab-0" aria-controls="auth-panel-0" disableRipple />
              <Tab label="Sign up" id="auth-tab-1" aria-controls="auth-panel-1" disableRipple />
            </Tabs>

            {err === 'auth' && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 0 }}>
                Google sign-in was cancelled or failed.
              </Alert>
            )}
            {err === 'user' && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 0 }}>
                Could not load your profile.
              </Alert>
            )}

            <Stack spacing={2} role="tabpanel" id={`auth-panel-${tab}`} aria-labelledby={`auth-tab-${tab}`}>
              {tab === 0 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Sign in with Google to access your account.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<IconGoogle />}
                    component="a"
                    href="/api/auth/google"
                    fullWidth
                    sx={{ py: 1.25 }}
                  >
                    Continue with Google
                  </Button>
                </>
              )}

              {tab === 1 && (
                <>
                  <Typography variant="body2" color="text.secondary">
                    New here? Google creates your account automatically on first sign-in—no extra forms in production.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<IconGoogle />}
                    component="a"
                    href="/api/auth/google"
                    fullWidth
                    sx={{ py: 1.25 }}
                  >
                    Sign up with Google
                  </Button>
                </>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, mb: 0 }}>
                {tab === 0 ? 'Returning customer' : 'Prefer email in development'}
              </Typography>

              {import.meta.env.DEV && (
                <Box
                  sx={{
                    borderTop: '1px solid',
                    borderColor: 'rgba(198, 198, 198, 0.15)',
                    pt: 2,
                    mt: 0,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, fontFamily: 'Inter, sans-serif' }}>
                    Development
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    {tab === 0
                      ? 'Run npm run seed, then sign in with a seeded email.'
                      : 'Create a new local user (fails if the email already exists).'}
                  </Typography>
                  <Stack spacing={2}>
                    {tab === 1 && (
                      <TextField
                        label="Name"
                        variant="standard"
                        fullWidth
                        value={devName}
                        onChange={(e) => setDevName(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                    <TextField
                      label="Email"
                      variant="standard"
                      fullWidth
                      type="email"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button
                      variant="outlined"
                      color="inherit"
                      disabled={busy || !devEmail.trim()}
                      onClick={() => void (tab === 0 ? devLogin() : devSignup())}
                      sx={{
                        borderColor: 'rgba(27, 27, 27, 0.35)',
                        color: 'text.primary',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      }}
                    >
                      {tab === 0 ? 'Dev sign in' : 'Dev create account'}
                    </Button>
                  </Stack>
                </Box>
              )}

              {devErr && (
                <Alert severity="error" sx={{ borderRadius: 0 }}>
                  {devErr}
                </Alert>
              )}
            </Stack>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
}
