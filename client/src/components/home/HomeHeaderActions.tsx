import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { homeSurface } from '../../constants/homeSurface';
import { useWishlist } from '../../context/WishlistContext';

const ICON_COLOR = '#050b18bd';

const actionIconSx = {
  fontSize: { xs: 22, sm: 24, md: 26 },
  color: ICON_COLOR,
} as const;

const actionButtonSx = {
  color: ICON_COLOR,
  flexShrink: 0,
  p: { xs: 0.15, sm: 0.35 },
  borderRadius: 1,
  bgcolor: 'transparent',
  boxShadow: 'none',
  transition: 'transform 0.2s ease, opacity 0.2s ease',
  '&:hover': {
    bgcolor: 'transparent',
    transform: 'scale(1.06)',
    opacity: 0.72,
    boxShadow: 'none',
  },
  '&:focus-visible': {
    outline: `2px solid ${homeSurface.accent}`,
    outlineOffset: 2,
  },
} as const;

export function HomeHeaderActions() {
  const { count: wishlistCount } = useWishlist();

  return (
    <Box
      component="nav"
      aria-label="Quick actions"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 0.75, md: 0.875 },
        flexShrink: 0,
        ml: { xs: 0.5, sm: 0.75, md: 0.875 },
      }}
    >
      <Tooltip title="Notifications">
        <IconButton
          component={RouterLink}
          to="/account"
          aria-label="Notifications"
          disableRipple
          sx={actionButtonSx}
        >
          <NotificationsOutlinedIcon sx={actionIconSx} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Wishlist">
        <IconButton
          component={RouterLink}
          to="/wishlist"
          aria-label={
            wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'
          }
          disableRipple
          sx={actionButtonSx}
        >
          <Badge
            badgeContent={wishlistCount}
            invisible={wishlistCount === 0}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: homeSurface.accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.58rem',
                minWidth: 15,
                height: 15,
              },
            }}
          >
            <FavoriteBorderOutlinedIcon sx={actionIconSx} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Tooltip title="Account">
        <IconButton
          component={RouterLink}
          to="/account"
          aria-label="Account"
          disableRipple
          sx={actionButtonSx}
        >
          <PersonOutlineOutlinedIcon sx={actionIconSx} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
