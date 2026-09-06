import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import { shopSurface } from '../constants/shopSurface';
import { BrandLogo } from './BrandLogo';
import { IconBag, IconChevronDown, IconClose, IconMenu } from '../icons';
import { cartBadgeCount, useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCategories } from '../context/CategoriesContext';
import { parseCollectionFilterParam } from '../utils/catalogCategory';

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

const listItemSx = {
  py: 1.25,
  '&.Mui-selected': {
    bgcolor: 'rgba(5, 11, 24, 0.08)',
    '&:hover': { bgcolor: 'rgba(5, 11, 24, 0.12)' },
  },
} as const;

const listTextSx = {
  fontFamily: shopSurface.font.body,
  fontSize: '1rem',
} as const;

/** Cream bar + centred serif logotype — shared on Home and Shop. */
export function StorefrontHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { lines } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { categories, loading: categoriesLoading } = useCategories();
  const cartCount = cartBadgeCount(lines);

  const shopCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  const activeShopCategory =
    location.pathname === '/shop'
      ? parseCollectionFilterParam(searchParams.get('category') ?? '', categories)
      : 'all';

  function closeMenu() {
    setMenuOpen(false);
  }

  function go(to: string) {
    closeMenu();
    navigate(to);
  }

  function goToShopCategory(slug: 'all' | string) {
    closeMenu();
    if (slug === 'all') {
      navigate('/shop#collections');
      return;
    }
    navigate(`/shop?category=${encodeURIComponent(slug)}#collections`);
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
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: 1,
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
        sx={{ color: shopSurface.ink, justifySelf: 'start', ml: -0.5 }}
      >
        <IconMenu />
      </IconButton>

      <Box
        component={RouterLink}
        to="/"
        sx={{
          justifySelf: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1 },
          textDecoration: 'none',
          color: shopSurface.ink,
          minWidth: 0,
          maxWidth: '100%',
        }}
      >
        <BrandLogo height={44} to={null} />
        <Typography
          component="h1"
          sx={{
            ...shopSurface.logo,
            m: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Paduchuandham
        </Typography>
      </Box>

      <IconButton
        component={RouterLink}
        to="/cart"
        aria-label="Cart"
        sx={{
          color: shopSurface.ink,
          justifySelf: 'end',
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
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(5, 11, 24, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <BrandLogo height={36} to={null} />
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
        </Box>
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
              sx={listItemSx}
            >
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontWeight: selected ? 700 : 500,
                  ...listTextSx,
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

        <ListItemButton
          onClick={() => setCategoriesOpen((open) => !open)}
          aria-expanded={categoriesOpen}
          selected={location.pathname === '/shop' && activeShopCategory !== 'all'}
          sx={listItemSx}
        >
          <ListItemText
            primary="Categories"
            primaryTypographyProps={{
              fontWeight: categoriesOpen || activeShopCategory !== 'all' ? 700 : 500,
              ...listTextSx,
            }}
          />
          <IconChevronDown
            fontSize="small"
            sx={{
              color: shopSurface.ink,
              transition: 'transform 0.2s ease',
              transform: categoriesOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </ListItemButton>

        <Collapse in={categoriesOpen} timeout="auto" unmountOnExit>
          <List dense disablePadding sx={{ pb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === '/shop' && activeShopCategory === 'all'}
              onClick={() => goToShopCategory('all')}
              sx={{ ...listItemSx, pl: 3.5, py: 1 }}
            >
              <ListItemText
                primary="All categories"
                primaryTypographyProps={{
                  fontWeight: activeShopCategory === 'all' ? 600 : 500,
                  ...listTextSx,
                  fontSize: '0.95rem',
                }}
              />
            </ListItemButton>
            {categoriesLoading ? (
              <ListItemButton disabled sx={{ pl: 3.5, py: 1 }}>
                <ListItemText
                  primary="Loading categories…"
                  primaryTypographyProps={{ ...listTextSx, fontSize: '0.95rem', color: shopSurface.inkMuted }}
                />
              </ListItemButton>
            ) : (
              shopCategories.map((category) => {
                const selected =
                  location.pathname === '/shop' && activeShopCategory === category.slug;
                return (
                  <ListItemButton
                    key={category.slug}
                    selected={selected}
                    onClick={() => goToShopCategory(category.slug)}
                    sx={{ ...listItemSx, pl: 3.5, py: 1 }}
                  >
                    <ListItemText
                      primary={category.label}
                      secondary={
                        category.productCount > 0
                          ? `${category.productCount} products`
                          : undefined
                      }
                      primaryTypographyProps={{
                        fontWeight: selected ? 600 : 500,
                        ...listTextSx,
                        fontSize: '0.95rem',
                      }}
                      secondaryTypographyProps={{
                        fontFamily: shopSurface.font.body,
                        fontSize: '0.75rem',
                        color: shopSurface.inkMuted,
                      }}
                    />
                  </ListItemButton>
                );
              })
            )}
          </List>
        </Collapse>

        {user?.role === 'admin' ? (
          <ListItemButton selected={location.pathname.startsWith('/admin')} onClick={() => go('/admin')} sx={listItemSx}>
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
