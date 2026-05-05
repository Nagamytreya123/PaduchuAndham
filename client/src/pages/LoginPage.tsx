import { useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { IconGoogle } from '../icons';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const err = params.get('error');
  const [devEmail, setDevEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [devErr, setDevErr] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const raw = params.get('redirect');
    if (raw?.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/account/orders';
  }, [params]);

  if (loading) {
    return (
      <Stack alignItems="center" py={6}>
        <CircularProgress />
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
      setDevErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2} maxWidth={420} mx="auto">
      <Typography variant="h5" fontWeight={700}>
        Sign in
      </Typography>

      {err === 'auth' && <Alert severity="warning">Google sign-in was cancelled or failed.</Alert>}
      {err === 'user' && <Alert severity="error">Could not load your profile.</Alert>}

      <Button
        variant="contained"
        size="large"
        startIcon={<IconGoogle />}
        component="a"
        href="/api/auth/google"
        fullWidth
      >
        Continue with Google
      </Button>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        Or return to{' '}
        <Typography component={RouterLink} to="/" color="primary">
          shop
        </Typography>
      </Typography>

      {import.meta.env.DEV && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Development login
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Run <code>npm run seed</code> first, then enter a seeded email.
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              label="Email"
              size="small"
              fullWidth
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
            />
            <Button variant="outlined" disabled={busy} onClick={() => void devLogin()}>
              Go
            </Button>
          </Stack>
          {devErr && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {devErr}
            </Alert>
          )}
        </Paper>
      )}
    </Stack>
  );
}
