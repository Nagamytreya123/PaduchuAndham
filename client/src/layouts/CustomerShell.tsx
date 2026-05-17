import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import { IconBag, IconHome, IconLogout, IconPerson } from '../icons';
import Badge from '@mui/material/Badge';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartBadgeCount, useCart } from '../context/CartContext';

export function CustomerShell() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lines } = useCart();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const cartCount = cartBadgeCount(lines);

  const isFullBleedRoute = location.pathname === '/' || location.pathname === '/login';

  const bottomValue = location.pathname.startsWith('/cart')
    ? 'cart'
    : location.pathname.startsWith('/account')
      ? 'account'
      : 'home';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: isXs ? 8 : 0 }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'rgba(198, 198, 198, 0.15)',
          backgroundColor: 'rgba(238, 238, 238, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'primary.main', fontWeight: 700 }}
          >
            Paduchu Shop
          </Typography>
          {!isXs && (
            <>
              <Typography component={RouterLink} to="/cart" color="inherit" sx={{ textDecoration: 'none' }}>
                Cart ({cartCount})
              </Typography>
              <Typography
                component={RouterLink}
                to="/account"
                color="inherit"
                sx={{ textDecoration: 'none', fontWeight: 600 }}
              >
                Account
              </Typography>
              {user?.role === 'admin' && (
                <Typography component={RouterLink} to="/admin" color="secondary.main" sx={{ textDecoration: 'none', fontWeight: 700 }}>
                  Admin
                </Typography>
              )}
              {user && (
                <Button color="inherit" size="small" onClick={() => void handleLogout()} sx={{ fontWeight: 600 }}>
                  Log out
                </Button>
              )}
              {!user && (
                <>
                  <Typography
                    component={RouterLink}
                    to="/login?mode=signup"
                    color="inherit"
                    sx={{ textDecoration: 'none', fontWeight: 600 }}
                  >
                    Join
                  </Typography>
                  <Typography
                    component={RouterLink}
                    to="/login"
                    color="primary"
                    sx={{ textDecoration: 'none', fontWeight: 600 }}
                  >
                    Sign in
                  </Typography>
                </>
              )}
            </>
          )}
          {isXs && user && (
            <IconButton onClick={() => void handleLogout()} aria-label="Log out" color="inherit" size="small">
              <IconLogout fontSize="small" />
            </IconButton>
          )}
          <IconButton component={RouterLink} to="/cart" aria-label="cart" sx={{ display: isXs ? 'flex' : 'none' }}>
            <Badge badgeContent={cartCount} color="secondary">
              <IconBag />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth={isFullBleedRoute ? false : 'lg'}
        disableGutters={isFullBleedRoute}
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: isFullBleedRoute ? '100%' : undefined,
          py: location.pathname === '/' || location.pathname === '/login' ? 0 : { xs: 2, sm: 3 },
          bgcolor: location.pathname === '/login' ? 'transparent' : undefined,
        }}
      >
        <Outlet />
      </Container>

      {isXs && (
        <BottomNavigation
          showLabels
          value={bottomValue}
          onChange={(_, v) => {
            if (v === 'home') navigate('/');
            if (v === 'cart') navigate('/cart');
            if (v === 'account') navigate('/account');
          }}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            borderColor: 'divider',
            zIndex: theme.zIndex.appBar,
          }}
        >
          <BottomNavigationAction label="Shop" value="home" icon={<IconHome />} />
          <BottomNavigationAction
            label="Cart"
            value="cart"
            icon={
              <Badge badgeContent={cartCount} color="secondary">
                <IconBag />
              </Badge>
            }
          />
          <BottomNavigationAction label="Account" value="account" icon={<IconPerson />} />
        </BottomNavigation>
      )}
    </Box>
  );
}
