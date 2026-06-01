import Box from '@mui/material/Box';
import { StorefrontHeader } from '../StorefrontHeader';
import { shopSurface } from '../../constants/shopSurface';
import { LuxuryShowcaseLoader } from './LuxuryShowcaseLoader';

type Props = {
  'aria-label'?: string;
};

/** Product detail loading — cream / ink 50:50 split with centred showcase loader. */
export function PdpLoadingState({ 'aria-label': ariaLabel = 'Loading product' }: Props) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <StorefrontHeader />
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pb: { xs: 8, sm: 0 },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
          }}
        >
          <Box sx={{ bgcolor: shopSurface.cream }} />
          <Box sx={{ bgcolor: '#0F0F10' }} />
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>
          <LuxuryShowcaseLoader variant="pdp" tone="light" aria-label={ariaLabel} />
        </Box>
      </Box>
    </Box>
  );
}
