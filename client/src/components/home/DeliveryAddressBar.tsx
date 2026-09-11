import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { homeSurface } from '../../constants/homeSurface';
import { IconChevronDown, IconLocationPin } from '../../icons';
import { useDefaultDeliveryAddress } from '../../hooks/useDefaultDeliveryAddress';

export function DeliveryAddressBar() {
  const navigate = useNavigate();
  const { address, loading, isLoggedIn } = useDefaultDeliveryAddress();

  function handleClick() {
    navigate(isLoggedIn ? '/account/addresses' : '/login');
  }

  return (
    <Box
      component="button"
      type="button"
      onClick={handleClick}
      aria-label={
        address
          ? `Deliver to ${address.primary}. Change delivery address`
          : 'Set delivery address'
      }
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        width: '100%',
        minWidth: 0,
        p: 0,
        border: 'none',
        bgcolor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        color: homeSurface.ink,
        borderRadius: 1.5,
        transition: 'background-color 0.2s ease, opacity 0.2s ease',
        '&:hover': { bgcolor: 'rgba(5, 11, 24, 0.04)' },
        '&:focus-visible': {
          outline: `2px solid ${homeSurface.accent}`,
          outlineOffset: 3,
        },
      }}
    >
      <IconLocationPin sx={{ fontSize: { xs: 20, sm: 22 }, flexShrink: 0, color: homeSurface.ink }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {loading ? (
          <Skeleton variant="text" width="70%" sx={{ fontSize: '0.72rem', bgcolor: 'rgba(5,11,24,0.08)' }} />
        ) : (
          <Typography
            component="span"
            sx={{
              display: 'block',
              fontFamily: homeSurface.font.body,
              fontSize: { xs: '0.7rem', sm: '0.72rem' },
              lineHeight: 1.35,
              color: homeSurface.ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Deliver to{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {address
                ? address.secondary
                  ? `${address.primary} - ${address.secondary}`
                  : address.primary
                : isLoggedIn
                  ? 'Add delivery address'
                  : 'Sign in to set address'}
            </Box>
          </Typography>
        )}
      </Box>
      <IconChevronDown
        sx={{
          fontSize: { xs: 18, sm: 20 },
          flexShrink: 0,
          color: homeSurface.inkMuted,
        }}
      />
    </Box>
  );
}
