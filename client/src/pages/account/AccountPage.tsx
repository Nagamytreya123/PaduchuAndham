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
import { IconBag, IconShipping } from '../../icons';

function ChevronRight() {
  return (
    <Typography color="text.secondary" sx={{ fontSize: '1.35rem', fontWeight: 300 }} aria-hidden>
      ›
    </Typography>
  );
}

function CardPayIcon() {
  return (
    <SvgIcon color="primary" fontSize="medium">
      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v4z" />
    </SvgIcon>
  );
}

function AddressBookIcon() {
  return (
    <SvgIcon color="primary" fontSize="medium">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
    </SvgIcon>
  );
}

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
    <Stack spacing={3} maxWidth={480} sx={{ mx: 'auto', width: '100%', pb: 2 }}>
      <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
        Account
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={user?.avatarUrl} alt="" sx={{ width: 56, height: 56 }}>
            {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>
              {user?.name ?? 'Signed in'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
            {user?.role === 'admin' && (
              <Button component={RouterLink} to="/admin" size="small" color="secondary" sx={{ mt: 0.5 }}>
                Admin dashboard
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>

      <Box>
        <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1} sx={{ px: 0.5 }}>
          Your activity
        </Typography>
        <Paper
          variant="outlined"
          sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}
        >
          <List disablePadding>
            <ListItemButton component={RouterLink} to="/account/orders" sx={{ py: 1.75, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <IconShipping color="primary" fontSize="medium" />
              </ListItemIcon>
              <ListItemText
                primary="My orders"
                secondary="Track deliveries and write reviews"
                primaryTypographyProps={{ fontWeight: 700 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton component={RouterLink} to="/account/addresses" sx={{ py: 1.75, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <AddressBookIcon />
              </ListItemIcon>
              <ListItemText
                primary="Saved addresses"
                secondary="Default shipping address and more"
                primaryTypographyProps={{ fontWeight: 700 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton component={RouterLink} to="/cart" sx={{ py: 1.75, px: 2 }}>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <Badge badgeContent={cartCount} color="secondary" invisible={cartCount === 0}>
                  <IconBag color="primary" fontSize="medium" />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="Shopping cart"
                secondary={cartCount > 0 ? `${cartCount} item(s) in your bag` : 'Your bag is empty'}
                primaryTypographyProps={{ fontWeight: 700 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ChevronRight />
            </ListItemButton>
            <Divider component="li" />
            <ListItemButton
              disabled={!canCheckout}
              onClick={() => {
                if (canCheckout) navigate('/checkout');
              }}
              sx={{ py: 1.75, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 44 }}>
                <Box sx={{ opacity: canCheckout ? 1 : 0.4 }}>
                  <CardPayIcon />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary="Secure checkout"
                secondary={
                  canCheckout
                    ? 'Complete payment for items in your cart'
                    : 'Add something to your cart to check out'
                }
                primaryTypographyProps={{ fontWeight: 700 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ChevronRight />
            </ListItemButton>
          </List>
        </Paper>
      </Box>

      <Button variant="outlined" color="inherit" onClick={() => void handleLogout()} fullWidth sx={{ py: 1.25 }}>
        Log out
      </Button>
    </Stack>
  );
}
