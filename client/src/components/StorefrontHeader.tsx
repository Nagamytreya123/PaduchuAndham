import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import { shopSurface } from '../constants/shopSurface';
import { IconBag, IconMenu } from '../icons';
import { cartBadgeCount, useCart } from '../context/CartContext';

/** Cream bar + centred serif logotype — shared on Home and Shop. */
export function StorefrontHeader() {
  const { lines } = useCart();
  const cartCount = cartBadgeCount(lines);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: theme => theme.zIndex.appBar + 1,
        display: 'grid',
        gridTemplateColumns: '48px 1fr 48px',
        alignItems: 'center',
        px: 1.5,
        py: 1.25,
        bgcolor: shopSurface.cream,
        borderBottom: '1px solid rgba(5, 11, 24, 0.08)',
        color: shopSurface.ink,
      }}
    >
      <IconButton aria-label="Menu" sx={{ color: shopSurface.ink, justifySelf: 'start' }}>
        <IconMenu />
      </IconButton>

      <Typography
        component={RouterLink}
        to="/"
        sx={{
          ...shopSurface.logo,
          justifySelf: 'center',
          gridColumn: 2,
          textAlign: 'center',
          textDecoration: 'none',
          color: shopSurface.ink,
        }}
      >
        Paduchuandham
      </Typography>

      <IconButton
        component={RouterLink}
        to="/cart"
        aria-label="Cart"
        sx={{
          color: shopSurface.ink,
          justifySelf: 'end',
          gridColumn: 3,
        }}
      >
        <Badge
          badgeContent={cartCount}
          invisible={cartCount === 0}
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: shopSurface.badge,
              color: shopSurface.white,
              fontWeight: 600,
              fontSize: '0.65rem',
              minWidth: 18,
              height: 18,
            },
          }}
        >
          <IconBag />
        </Badge>
      </IconButton>
    </Box>
  );
}
