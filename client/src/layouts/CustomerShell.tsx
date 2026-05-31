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
import { IconBag, IconHeart, IconHome, IconLogout, IconPerson, IconShop } from '../icons';
import Badge from '@mui/material/Badge';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cartBadgeCount, useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { authSurface as authS } from '../constants/authSurface';
import { shopSurface } from '../constants/shopSurface';

export function CustomerShell() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const { count: wishlistCount } = useWishlist();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const cartCount = cartBadgeCount(lines);

  /** Full-bleed storefront pages with in-page chrome (home editorial landing or `StorefrontHeader`). */
  const hasInPageStorefrontHeader =
    location.pathname === '/' ||
    location.pathname === '/shop' ||
    location.pathname === '/wishlist' ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname === '/account' ||
    location.pathname.startsWith('/account/') ||
    location.pathname.startsWith('/products/') ||
    location.pathname.startsWith('/jewellery-combos/');
  const isFullBleedRoute = hasInPageStorefrontHeader || location.pathname === '/login';
  const isLogin = location.pathname === '/login';

  const bottomValue = location.pathname === '/shop'
    ? 'shop'
    : location.pathname === '/wishlist'
      ? 'wishlist'
      : location.pathname.startsWith('/account')
        ? 'profile'
        : 'home';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: isXs ? 8 : 0 }}>
      {!hasInPageStorefrontHeader && (
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: '1px solid',
          ...(isLogin
            ? {
                borderColor: 'rgba(232, 216, 168, 0.22)',
                backgroundColor: 'rgba(15, 13, 11, 0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: authS.text.primary,
              }
            : {
                borderColor: 'rgba(198, 198, 198, 0.15)',
                backgroundColor: 'rgba(238, 238, 238, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }),
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              ...(isLogin
                ? {
                    fontFamily: authS.font.display,
                    fontWeight: 700,
                    fontSize: { xs: '1.2rem', sm: '1.35rem' },
                    letterSpacing: '0.03em',
                    color: authS.text.display,
                    textShadow: authS.accentGlow,
                  }
                : {
                    color: 'primary.main',
                    fontWeight: 700,
                  }),
            }}
          >
            Paduchuandham
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
          <IconButton
            component={RouterLink}
            to="/cart"
            aria-label="cart"
            sx={{
              display: isXs ? 'flex' : 'none',
              ...(isLogin && { color: authS.text.display }),
            }}
          >
            <Badge badgeContent={cartCount} color="secondary">
              <IconBag />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>
      )}

      <Container
        maxWidth={isFullBleedRoute ? false : 'lg'}
        disableGutters={isFullBleedRoute}
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: isFullBleedRoute ? '100%' : undefined,
          py: isFullBleedRoute ? 0 : { xs: 2, sm: 3 },
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
            if (v === 'shop') navigate('/shop');
            if (v === 'wishlist') navigate('/wishlist');
            if (v === 'profile') navigate('/account');
          }}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: 1,
            zIndex: theme.zIndex.appBar,
            background: `linear-gradient(to top, ${shopSurface.cream} 0%, rgba(255, 255, 255, 0.96) 100%)`,
            ...(isLogin
              ? {
                  bgcolor: 'rgba(15, 13, 11, 0.96)',
                  borderColor: 'rgba(232, 216, 168, 0.18)',
                  '& .MuiBottomNavigationAction-root': { color: authS.text.faint },
                  '& .MuiBottomNavigationAction-root.Mui-selected': { color: authS.accent },
                }
              : {
                  borderColor: 'rgba(26, 26, 26, 0.08)',
                  '& .MuiBottomNavigationAction-root': {
                    color: 'rgba(26, 26, 26, 0.45)',
                    minWidth: 0,
                    px: 0.5,
                  },
                  '& .MuiBottomNavigationAction-root.Mui-selected': {
                    color: shopSurface.ink,
                  },
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  },
                }),
          }}
        >
          <BottomNavigationAction label="Home" value="home" icon={<IconHome />} />
          <BottomNavigationAction label="Shop" value="shop" icon={<IconShop />} />
          <BottomNavigationAction
            label="Wishlist"
            value="wishlist"
            icon={
              <Badge badgeContent={wishlistCount} color="secondary" invisible={wishlistCount === 0}>
                <IconHeart />
              </Badge>
            }
          />
          <BottomNavigationAction label="Profile" value="profile" icon={<IconPerson />} />
        </BottomNavigation>
      )}
    </Box>
  );
}
