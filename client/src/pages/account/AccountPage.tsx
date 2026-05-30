import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import SvgIcon from '@mui/material/SvgIcon';
import Badge from '@mui/material/Badge';
import { useAuth } from '../../context/AuthContext';
import { cartBadgeCount, useCart } from '../../context/CartContext';
import { shopSurface } from '../../constants/shopSurface';
import { IconBag, IconShipping } from '../../icons';

function ChevronRight() {
  return (
    <Typography sx={{ fontSize: '1.35rem', fontWeight: 300, color: shopSurface.inkMuted }} aria-hidden>
      ›
    </Typography>
  );
}

function CardPayIcon() {
  return (
    <SvgIcon fontSize="medium" sx={{ color: shopSurface.ink }}>
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v4z" />
    </SvgIcon>
  );
}

function AddressBookIcon() {
  return (
    <SvgIcon fontSize="medium" sx={{ color: shopSurface.ink }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </SvgIcon>
  );
}

const listItemSx = {
  py: 1.75,
  px: 2,
  color: shopSurface.ink,
  '&:hover': { bgcolor: 'rgba(5, 11, 24, 0.04)' },
};

export function AccountPage() {
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const navigate = useNavigate();
  const cartCount = cartBadgeCount(lines);
  const canCheckout = cartCount > 0;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <Stack spacing={3} sx={{ width: '100%', pb: 2 }}>
      <Typography component="h1" sx={shopSurface.pageTitle}>
        Account
      </Typography>

      <Paper elevation={0} sx={shopSurface.card}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={user?.avatarUrl} alt="" sx={{ width: 56, height: 56, bgcolor: shopSurface.bandTop, color: shopSurface.ink }}>
            {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: shopSurface.font.display, fontWeight: 600, fontSize: '1.1rem' }} noWrap>
              {user?.name ?? 'Signed in'}
            </Typography>
            <Typography variant="body2" sx={{ color: shopSurface.inkMuted }} noWrap>
              {user?.email}
            </Typography>
            {user?.role === 'admin' && (
              <Button
                component={RouterLink}
                to="/admin"
                size="small"
                sx={{
                  mt: 0.75,
                  color: shopSurface.ink,
                  borderColor: 'rgba(5, 11, 24, 0.2)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
                variant="outlined"
              >
                Admin dashboard
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>

      <Box>
        <Typography
          sx={{
            fontFamily: shopSurface.font.body,
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: shopSurface.inkMuted,
            px: 0.5,
            mb: 1,
          }}
        >
          Your activity
        </Typography>
        <Paper elevation={0} sx={{ ...shopSurface.card, p: 0, overflow: 'hidden' }}>
          <List disablePadding>
            <ListItemButton component={RouterLink} to="/account/orders" sx={listItemSx}>
              <ListItemIcon sx={{ minWidth: 44, color: shopSurface.ink }}>
                <IconShipping fontSize="medium" />
              </ListItemIcon>
              <ListItemText
                primary="My orders"
                secondary="Track deliveries and write reviews"
                primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body, color: shopSurface.ink }}
                secondaryTypographyProps={{ variant: 'caption', sx: { color: shopSurface.inkMuted } }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider sx={{ borderColor: 'rgba(5, 11, 24, 0.08)' }} />
            <ListItemButton component={RouterLink} to="/account/addresses" sx={listItemSx}>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <AddressBookIcon />
              </ListItemIcon>
              <ListItemText
                primary="Saved addresses"
                secondary="Default shipping address and more"
                primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body, color: shopSurface.ink }}
                secondaryTypographyProps={{ variant: 'caption', sx: { color: shopSurface.inkMuted } }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider sx={{ borderColor: 'rgba(5, 11, 24, 0.08)' }} />
            <ListItemButton component={RouterLink} to="/cart" sx={listItemSx}>
              <ListItemIcon sx={{ minWidth: 44, color: shopSurface.ink }}>
                <Badge
                  badgeContent={cartCount}
                  invisible={cartCount === 0}
                  sx={{
                    '& .MuiBadge-badge': {
                      bgcolor: shopSurface.badge,
                      color: shopSurface.white,
                    },
                  }}
                >
                  <IconBag fontSize="medium" />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="Shopping cart"
                secondary={cartCount > 0 ? `${cartCount} item(s) in your bag` : 'Your bag is empty'}
                primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body, color: shopSurface.ink }}
                secondaryTypographyProps={{ variant: 'caption', sx: { color: shopSurface.inkMuted } }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider sx={{ borderColor: 'rgba(5, 11, 24, 0.08)' }} />
            <ListItemButton
              disabled={!canCheckout}
              onClick={() => {
                if (canCheckout) navigate('/checkout');
              }}
              sx={listItemSx}
            >
              <ListItemIcon sx={{ minWidth: 44 }}>
                <Box sx={{ opacity: canCheckout ? 1 : 0.4 }}>
                  <CardPayIcon />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary="Secure checkout"
                secondary={
                  canCheckout ? 'Complete payment for items in your cart' : 'Add something to your cart to check out'
                }
                primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body, color: shopSurface.ink }}
                secondaryTypographyProps={{ variant: 'caption', sx: { color: shopSurface.inkMuted } }}
              />
              <ChevronRight />
            </ListItemButton>
          </List>
        </Paper>
      </Box>

      <Button
        variant="outlined"
        onClick={() => void handleLogout()}
        fullWidth
        sx={{
          py: 1.25,
          borderColor: 'rgba(5, 11, 24, 0.2)',
          color: shopSurface.ink,
          fontFamily: shopSurface.font.body,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
        }}
      >
        Log out
      </Button>
    </Stack>
  );
}
