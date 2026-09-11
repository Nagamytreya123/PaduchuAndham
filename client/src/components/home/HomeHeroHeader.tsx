import Box from '@mui/material/Box';
import { StorefrontSearchBar } from '../StorefrontSearchBar';
import { DeliveryAddressBar } from './DeliveryAddressBar';
import { HomeHeaderActions } from './HomeHeaderActions';
import { homeSurface } from '../../constants/homeSurface';

type HomeHeroHeaderProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (value: string) => void;
};

export function HomeHeroHeader({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}: HomeHeroHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        background: homeSurface.pageGradient,
        borderBottom: `1px solid ${homeSurface.border}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      <Box
        sx={{
          maxWidth: 920,
          mx: 'auto',
          px: { xs: 1.5, sm: 2.25 },
          pt: { xs: 1, sm: 1.25 },
          pb: { xs: 1.25, sm: 1.5 },
        }}
      >
        <DeliveryAddressBar />

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 0.75, md: 0.875 },
            mt: { xs: 1, sm: 1.25 },
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <StorefrontSearchBar
              value={searchQuery}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              size="large"
              placeholder="Search products…"
            />
          </Box>
          <HomeHeaderActions />
        </Box>
      </Box>
    </Box>
  );
}
