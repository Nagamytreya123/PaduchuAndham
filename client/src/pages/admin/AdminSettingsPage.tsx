import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { apiFetch } from '../../api/client';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { AdminPageHeader, DashboardCard, PageTransitionWrapper } from '../../components/admin/premium';
import { paiseToRupeesInput, rupeesToPaise } from '../../utils/shipping';

type SocialLinksPublic = {
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
};

type SiteSettings = {
  homeScrollAnimationEnabled: boolean;
  supportWhatsAppMobile: string;
  socialLinks: SocialLinksPublic;
  shipping: {
    chargePaise: number;
    freeShippingMinPaise: number | null;
  };
};

type ShippingMeta = {
  defaultChargePaise: number;
  storedChargePaise: number | null;
  storedFreeShippingMinPaise: number | null;
  active: {
    chargePaise: number;
    freeShippingMinPaise: number | null;
  };
};

type SupportWhatsAppMeta = {
  envDefault: string;
  stored: string | null;
  source: 'database' | 'env';
};

type SocialLinkMeta = {
  envDefault: string | null;
  stored: string | null;
  active: string | null;
  source: 'database' | 'env' | 'none';
};

type SocialLinksMeta = {
  instagram: SocialLinkMeta;
  youtube: SocialLinkMeta;
  facebook: SocialLinkMeta;
};

type AdminSiteSettingsResponse = {
  settings: SiteSettings;
  supportWhatsApp: SupportWhatsAppMeta;
  socialLinks: SocialLinksMeta;
  shipping: ShippingMeta;
};

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({
    homeScrollAnimationEnabled: false,
    supportWhatsAppMobile: '',
    socialLinks: { instagram: null, youtube: null, facebook: null },
    shipping: { chargePaise: 10_000, freeShippingMinPaise: null },
  });
  const [supportWhatsApp, setSupportWhatsApp] = useState<SupportWhatsAppMeta>({
    envDefault: '',
    stored: null,
    source: 'env',
  });
  const [socialLinksMeta, setSocialLinksMeta] = useState<SocialLinksMeta>({
    instagram: { envDefault: null, stored: null, active: null, source: 'none' },
    youtube: { envDefault: null, stored: null, active: null, source: 'none' },
    facebook: { envDefault: null, stored: null, active: null, source: 'none' },
  });
  const [shippingMeta, setShippingMeta] = useState<ShippingMeta>({
    defaultChargePaise: 10_000,
    storedChargePaise: null,
    storedFreeShippingMinPaise: null,
    active: { chargePaise: 10_000, freeShippingMinPaise: null },
  });
  const [whatsappInput, setWhatsappInput] = useState('');
  const [instagramInput, setInstagramInput] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [facebookInput, setFacebookInput] = useState('');
  const [shippingChargeInput, setShippingChargeInput] = useState('100');
  const [freeShippingMinInput, setFreeShippingMinInput] = useState('');

  function applyAdminPayload(data: AdminSiteSettingsResponse) {
    setSettings(data.settings);
    setSupportWhatsApp(data.supportWhatsApp);
    setSocialLinksMeta(data.socialLinks);
    setShippingMeta(data.shipping);
    setWhatsappInput(data.supportWhatsApp.stored ?? '');
    setInstagramInput(data.socialLinks.instagram.stored ?? '');
    setYoutubeInput(data.socialLinks.youtube.stored ?? '');
    setFacebookInput(data.socialLinks.facebook.stored ?? '');
    setShippingChargeInput(paiseToRupeesInput(data.shipping.active.chargePaise));
    setFreeShippingMinInput(paiseToRupeesInput(data.shipping.storedFreeShippingMinPaise));
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<AdminSiteSettingsResponse>('/api/admin/site-settings');
        applyAdminPayload(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function patchSettings(body: Record<string, unknown>, errorMessage: string) {
    setError(null);
    setSaving(true);
    try {
      const data = await apiFetch<AdminSiteSettingsResponse>('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      applyAdminPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : errorMessage);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminLoadingPlaceholder variant="dashboard" />;

  const activeDisplay = settings.supportWhatsAppMobile
    ? `+91 ${settings.supportWhatsAppMobile}`
    : 'Not set';

  function sourceLabel(source: SocialLinkMeta['source']) {
    if (source === 'database') return 'saved in admin';
    if (source === 'env') return 'from environment default';
    return 'not set';
  }

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
                  onChange={(_e, checked) =>
                    void patchSettings({ homeScrollAnimationEnabled: checked }, 'Failed to save')
                  }
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
              <Button
                variant="contained"
                disabled={saving}
                onClick={() =>
                  void patchSettings(
                    { supportWhatsAppMobile: whatsappInput.trim() || null },
                    'Failed to save WhatsApp number',
                  )
                }
              >
                Save WhatsApp number
              </Button>
              <Button
                variant="outlined"
                disabled={saving}
                onClick={() => void patchSettings({ supportWhatsAppMobile: null }, 'Failed to reset WhatsApp number')}
              >
                Use environment default
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>

        <DashboardCard float sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Social links
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Footer links on the home page. Leave a field empty and save to fall back to the environment default.
            </Typography>

            {(
              [
                {
                  key: 'instagram' as const,
                  label: 'Instagram',
                  value: instagramInput,
                  onChange: setInstagramInput,
                  meta: socialLinksMeta.instagram,
                },
                {
                  key: 'youtube' as const,
                  label: 'YouTube',
                  value: youtubeInput,
                  onChange: setYoutubeInput,
                  meta: socialLinksMeta.youtube,
                },
                {
                  key: 'facebook' as const,
                  label: 'Facebook',
                  value: facebookInput,
                  onChange: setFacebookInput,
                  meta: socialLinksMeta.facebook,
                },
              ] as const
            ).map((field) => (
              <Box key={field.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Active {field.label}:{' '}
                  <strong>{field.meta.active ?? 'Not set'}</strong> ({sourceLabel(field.meta.source)})
                </Typography>
                {field.meta.envDefault ? (
                  <Typography variant="caption" color="text.secondary">
                    Environment default: {field.meta.envDefault}
                  </Typography>
                ) : null}
                <TextField
                  label={`${field.label} URL`}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.meta.envDefault ?? 'https://'}
                  helperText="Full https:// profile or channel URL."
                  disabled={saving}
                  fullWidth
                />
              </Box>
            ))}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                disabled={saving}
                onClick={() =>
                  void patchSettings(
                    {
                      socialInstagramUrl: instagramInput.trim() || null,
                      socialYoutubeUrl: youtubeInput.trim() || null,
                      socialFacebookUrl: facebookInput.trim() || null,
                    },
                    'Failed to save social links',
                  )
                }
              >
                Save social links
              </Button>
              <Button
                variant="outlined"
                disabled={saving}
                onClick={() =>
                  void patchSettings(
                    {
                      socialInstagramUrl: null,
                      socialYoutubeUrl: null,
                      socialFacebookUrl: null,
                    },
                    'Failed to reset social links',
                  )
                }
              >
                Use environment defaults
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>

        <DashboardCard float sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Shipping
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customers see shipping only at checkout. Active charge:{' '}
              <strong>₹{shippingMeta.active.chargePaise / 100}</strong>
              {shippingMeta.active.freeShippingMinPaise != null
                ? ` · free above ₹${shippingMeta.active.freeShippingMinPaise / 100}`
                : ' · no free-shipping threshold'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Default charge when not saved in admin: ₹{shippingMeta.defaultChargePaise / 100}
            </Typography>
            <TextField
              label="Shipping charge (₹)"
              value={shippingChargeInput}
              onChange={(e) => setShippingChargeInput(e.target.value)}
              helperText="Flat shipping fee applied when the free-shipping minimum is not met."
              disabled={saving}
              fullWidth
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              label="Free shipping above (₹)"
              value={freeShippingMinInput}
              onChange={(e) => setFreeShippingMinInput(e.target.value)}
              placeholder="Optional"
              helperText="Leave empty to always charge shipping. Order subtotal (₹) must reach this amount for free shipping."
              disabled={saving}
              fullWidth
              inputProps={{ inputMode: 'decimal' }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                disabled={saving}
                onClick={() => {
                  const chargePaise = rupeesToPaise(shippingChargeInput);
                  if (chargePaise == null) {
                    setError('Enter a valid shipping charge in rupees.');
                    return;
                  }
                  const minRaw = freeShippingMinInput.trim();
                  let freeShippingMinPaise: number | null = null;
                  if (minRaw) {
                    freeShippingMinPaise = rupeesToPaise(minRaw);
                    if (freeShippingMinPaise == null || freeShippingMinPaise <= 0) {
                      setError('Enter a valid free-shipping minimum in rupees, or leave it empty.');
                      return;
                    }
                  }
                  void patchSettings(
                    { shippingChargePaise: chargePaise, freeShippingMinPaise },
                    'Failed to save shipping settings',
                  );
                }}
              >
                Save shipping settings
              </Button>
              <Button
                variant="outlined"
                disabled={saving}
                onClick={() => {
                  setShippingChargeInput(paiseToRupeesInput(shippingMeta.defaultChargePaise));
                  setFreeShippingMinInput('');
                  void patchSettings(
                    {
                      shippingChargePaise: shippingMeta.defaultChargePaise,
                      freeShippingMinPaise: null,
                    },
                    'Failed to reset shipping settings',
                  );
                }}
              >
                Reset to default
              </Button>
            </Stack>
          </Stack>
        </DashboardCard>
      </Stack>
    </PageTransitionWrapper>
  );
}
