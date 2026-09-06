import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { apiFetch } from '../../api/client';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { AdminPageHeader, DashboardCard, PageTransitionWrapper } from '../../components/admin/premium';

type SiteSettings = {
  homeScrollAnimationEnabled: boolean;
  supportWhatsAppMobile: string;
};

type SupportWhatsAppMeta = {
  envDefault: string;
  stored: string | null;
  source: 'database' | 'env';
};

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({
    homeScrollAnimationEnabled: false,
    supportWhatsAppMobile: '',
  });
  const [supportWhatsApp, setSupportWhatsApp] = useState<SupportWhatsAppMeta>({
    envDefault: '',
    stored: null,
    source: 'env',
  });
  const [whatsappInput, setWhatsappInput] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ settings: SiteSettings; supportWhatsApp: SupportWhatsAppMeta }>(
          '/api/admin/site-settings',
        );
        setSettings(data.settings);
        setSupportWhatsApp(data.supportWhatsApp);
        setWhatsappInput(data.supportWhatsApp.stored ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleHomeAnimation(enabled: boolean) {
    setError(null);
    setSaving(true);
    try {
      const data = await apiFetch<{ settings: SiteSettings; supportWhatsApp: SupportWhatsAppMeta }>(
        '/api/admin/site-settings',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScrollAnimationEnabled: enabled }),
        },
      );
      setSettings(data.settings);
      setSupportWhatsApp(data.supportWhatsApp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function saveWhatsAppNumber() {
    setError(null);
    setSaving(true);
    try {
      const data = await apiFetch<{ settings: SiteSettings; supportWhatsApp: SupportWhatsAppMeta }>(
        '/api/admin/site-settings',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supportWhatsAppMobile: whatsappInput.trim() || null }),
        },
      );
      setSettings(data.settings);
      setSupportWhatsApp(data.supportWhatsApp);
      setWhatsappInput(data.supportWhatsApp.stored ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save WhatsApp number');
    } finally {
      setSaving(false);
    }
  }

  async function resetWhatsAppToEnv() {
    setWhatsappInput('');
    setError(null);
    setSaving(true);
    try {
      const data = await apiFetch<{ settings: SiteSettings; supportWhatsApp: SupportWhatsAppMeta }>(
        '/api/admin/site-settings',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supportWhatsAppMobile: null }),
        },
      );
      setSettings(data.settings);
      setSupportWhatsApp(data.supportWhatsApp);
      setWhatsappInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset WhatsApp number');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminLoadingPlaceholder variant="dashboard" />;

  const activeDisplay = settings.supportWhatsAppMobile
    ? `+91 ${settings.supportWhatsAppMobile}`
    : 'Not set';

  return (
    <PageTransitionWrapper>
      <Stack spacing={3}>
        <AdminPageHeader
          title="Storefront settings"
          description="Control how the home page and customer support contact options are presented."
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <DashboardCard float sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Home page
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.homeScrollAnimationEnabled}
                  disabled={saving}
                  onChange={(_e, checked) => void toggleHomeAnimation(checked)}
                />
              }
              label="Scroll animation & brand story"
            />
            <Typography variant="body2" color="text.secondary">
              When off, the home page opens directly on Shop by categories — no scroll-driven video
              sequence and no &ldquo;Designed to elevate modern femininity&rdquo; section.
            </Typography>
          </Stack>
        </DashboardCard>

        <DashboardCard float sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              WhatsApp support
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active on Contact Us: <strong>{activeDisplay}</strong>
              {supportWhatsApp.source === 'database' ? ' (saved in admin)' : ' (from environment default)'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Environment default: +91 {supportWhatsApp.envDefault}
            </Typography>
            <TextField
              label="WhatsApp number"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              placeholder={supportWhatsApp.envDefault}
              helperText="10-digit Indian mobile. Leave empty and save to use the environment default."
              disabled={saving}
              fullWidth
              inputProps={{ inputMode: 'numeric', autoComplete: 'tel' }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="contained" disabled={saving} onClick={() => void saveWhatsAppNumber()}>
                Save WhatsApp number
              </Button>
              <Button variant="outlined" disabled={saving} onClick={() => void resetWhatsAppToEnv()}>
                Use environment default
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>
      </Stack>
    </PageTransitionWrapper>
  );
}
