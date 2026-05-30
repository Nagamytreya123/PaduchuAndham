import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { shopSurface } from '../constants/shopSurface';
import { IconBag, IconClose, IconMenu } from '../icons';
import { cartBadgeCount, useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Wishlist', to: '/wishlist' },
  { label: 'Cart', to: '/cart' },
  { label: 'Account', to: '/account' },
] as const;

function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Cream bar + centred serif logotype — shared on Home and Shop. */
export function StorefrontHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const { count: wishlistCount } = useWishlist();
  const cartCount = cartBadgeCount(lines);

  function closeMenu() {
    setMenuOpen(false);
  }

  function go(to: string) {
    closeMenu();
    navigate(to);
  }

  async function handleLogout() {
    closeMenu();
    await logout();
    navigate('/');
  }

  return (
    <>
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
      <IconButton
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="storefront-nav-drawer"
        onClick={() => setMenuOpen(true)}
        sx={{ color: shopSurface.ink, justifySelf: 'start' }}
      >
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

    <Drawer
      id="storefront-nav-drawer"
      anchor="left"
      open={menuOpen}
      onClose={closeMenu}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: 'min(300px, 88vw)', sm: 320 },
          bgcolor: shopSurface.cream,
          color: shopSurface.ink,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(5, 11, 24, 0.08)',
        }}
      >
        <Typography
          sx={{
            fontFamily: shopSurface.font.display,
            fontSize: '1.35rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}
        >
          Menu
        </Typography>
        <IconButton aria-label="Close menu" onClick={closeMenu} sx={{ color: shopSurface.ink }}>
          <IconClose />
        </IconButton>
      </Box>

      <List sx={{ py: 1 }}>
        {NAV_LINKS.map(({ label, to }) => {
          const selected = isNavActive(location.pathname, to);
          const badge =
            to === '/cart' && cartCount > 0
              ? cartCount
              : to === '/wishlist' && wishlistCount > 0
                ? wishlistCount
                : undefined;
          return (
            <ListItemButton
              key={to}
              selected={selected}
              onClick={() => go(to)}
              sx={{
                py: 1.25,
                '&.Mui-selected': {
                  bgcolor: 'rgba(5, 11, 24, 0.08)',
                  '&:hover': { bgcolor: 'rgba(5, 11, 24, 0.12)' },
                },
              }}
            >
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontWeight: selected ? 700 : 500,
                  fontFamily: shopSurface.font.body,
                  fontSize: '1rem',
                }}
              />
              {badge != null ? (
                <Typography
                  component="span"
                  sx={{
                    ml: 1,
                    minWidth: 22,
                    height: 22,
                    px: 0.75,
                    borderRadius: 99,
                    bgcolor: shopSurface.badge,
                    color: shopSurface.white,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {badge}
                </Typography>
              ) : null}
            </ListItemButton>
          );
        })}
        {user?.role === 'admin' ? (
          <ListItemButton selected={location.pathname.startsWith('/admin')} onClick={() => go('/admin')}>
            <ListItemText
              primary="Admin"
              primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body }}
            />
          </ListItemButton>
        ) : null}
      </List>

      <Divider sx={{ borderColor: 'rgba(5, 11, 24, 0.08)' }} />

      <List sx={{ py: 1 }}>
        {user ? (
          <ListItemButton onClick={() => void handleLogout()}>
            <ListItemText primary="Log out" primaryTypographyProps={{ fontFamily: shopSurface.font.body }} />
          </ListItemButton>
        ) : (
          <>
            <ListItemButton onClick={() => go('/login')}>
              <ListItemText primary="Sign in" primaryTypographyProps={{ fontWeight: 600, fontFamily: shopSurface.font.body }} />
            </ListItemButton>
            <ListItemButton onClick={() => go('/login?mode=signup')}>
              <ListItemText primary="Join" primaryTypographyProps={{ fontFamily: shopSurface.font.body }} />
            </ListItemButton>
          </>
        )}
      </List>
    </Drawer>
    </>
  );
}
