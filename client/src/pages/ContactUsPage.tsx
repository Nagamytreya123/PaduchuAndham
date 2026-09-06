import { useEffect, useLayoutEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { apiFetch } from '../api/client';
import { LuxuryShowcaseLoader } from '../components/loading';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { shopSurface } from '../constants/shopSurface';
import {
  buildWhatsAppChatUrl,
  formatSupportPhoneDisplay,
  getClientSupportWhatsAppFallback,
  isMobileUserAgent,
} from '../constants/support';

export function ContactUsPage() {
  const [mobile, setMobile] = useState<string | null>(() => getClientSupportWhatsAppFallback());
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ settings: { supportWhatsAppMobile: string } }>('/api/site-settings');
        setMobile(data.settings.supportWhatsAppMobile);
      } catch {
        setMobile((current) => current ?? getClientSupportWhatsAppFallback());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useLayoutEffect(() => {
    if (!mobile || !isMobileUserAgent()) return;
    setRedirecting(true);
    window.location.replace(buildWhatsAppChatUrl(mobile));
  }, [mobile]);

  const whatsappUrl = mobile ? buildWhatsAppChatUrl(mobile) : null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: shopSurface.cream,
        color: shopSurface.ink,
        pb: { xs: 10, sm: 4 },
      }}
    >
      <StorefrontHeader />

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 4, sm: 6 },
          maxWidth: 520,
          mx: 'auto',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: shopSurface.font.display,
            fontSize: { xs: '1.75rem', sm: '2rem' },
            fontWeight: 500,
            mb: 1.5,
          }}
        >
          Contact us
        </Typography>

        {loading ? (
          <LuxuryShowcaseLoader variant="inline" tone="light" aria-label="Loading contact details" />
        ) : redirecting ? (
          <Typography sx={{ color: shopSurface.inkMuted, fontFamily: shopSurface.font.body }}>
            Opening WhatsApp…
          </Typography>
        ) : mobile && whatsappUrl ? (
          <>
            <Typography
              sx={{
                color: shopSurface.inkMuted,
                fontFamily: shopSurface.font.body,
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              Chat with our team on WhatsApp for product questions, orders, and support.
            </Typography>
            <Button
              component="a"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              sx={{
                ...shopSurface.cta,
                px: 3,
                mb: 2,
              }}
            >
              Chat on WhatsApp
            </Button>
            <Typography sx={{ color: shopSurface.inkMuted, fontFamily: shopSurface.font.body, fontSize: '0.9rem' }}>
              {formatSupportPhoneDisplay(mobile)}
            </Typography>
          </>
        ) : (
          <Typography sx={{ color: shopSurface.inkMuted, fontFamily: shopSurface.font.body }}>
            Support contact is not available right now. Please try again later.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
