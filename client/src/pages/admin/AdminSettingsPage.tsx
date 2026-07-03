import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { apiFetch } from '../../api/client';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { AdminPageHeader, DashboardCard, PageTransitionWrapper } from '../../components/admin/premium';

type SiteSettings = {
  homeScrollAnimationEnabled: boolean;
};

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({ homeScrollAnimationEnabled: false });

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ settings: SiteSettings }>('/api/admin/site-settings');
        setSettings(data.settings);
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
      const data = await apiFetch<{ settings: SiteSettings }>('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScrollAnimationEnabled: enabled }),
      });
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminLoadingPlaceholder variant="dashboard" />;

  return (
    <PageTransitionWrapper>
      <Stack spacing={3}>
        <AdminPageHeader
          title="Storefront settings"
          description="Control how the home page is presented to customers."
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
      </Stack>
    </PageTransitionWrapper>
  );
}
