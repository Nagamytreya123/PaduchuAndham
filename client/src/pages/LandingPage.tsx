import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router-dom';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { BestSellersShowcase } from '../components/landing/BestSellersShowcase';
import { shopSurface } from '../constants/shopSurface';

/**
 * Marketing landing page — cinematic best-sellers showcase and entry to the shop.
 */
export function LandingPage() {
  return (
    <Box
      className="editorial-landing"
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f0f10',
        color: '#fff',
        pb: { xs: 10, sm: 4 },
      }}
    >
      <StorefrontHeader />

      <Box
        component="section"
        sx={{
          position: 'relative',
          px: { xs: 2, sm: 4 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 4 },
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <Typography
          sx={{
            fontFamily: shopSurface.font.display,
            fontWeight: 500,
            fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
            letterSpacing: '0.04em',
            lineHeight: 1.12,
            color: shopSurface.cream,
            mb: 1.5,
          }}
        >
          Timeless pieces, crafted for you
        </Typography>
        <Typography
          sx={{
            fontFamily: shopSurface.font.body,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            color: 'rgba(255,255,255,0.62)',
            maxWidth: 520,
            mx: 'auto',
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          Discover our most-loved watches, bangles, and jewellery — curated for everyday elegance.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          <Button
            component={RouterLink}
            to="/shop"
            variant="contained"
            sx={{
              bgcolor: '#c4a574',
              color: '#1a1410',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              borderRadius: 999,
              px: 3,
              py: 1.2,
              '&:hover': { bgcolor: '#d4b888' },
            }}
          >
            Shop now
          </Button>
          <Button
            component={RouterLink}
            to="/#collection"
            variant="outlined"
            sx={{
              borderColor: 'rgba(201, 184, 154, 0.4)',
              color: '#c9b89a',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              borderRadius: 999,
              px: 3,
              py: 1.2,
              '&:hover': {
                borderColor: '#c9b89a',
                bgcolor: 'rgba(201, 184, 154, 0.08)',
              },
            }}
          >
            View catalogue
          </Button>
        </Stack>
      </Box>

      <BestSellersShowcase variant="landing" />
    </Box>
  );
}
