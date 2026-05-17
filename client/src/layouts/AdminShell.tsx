import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconInventory,
  IconLogout,
  IconMenu,
  IconReviews,
  IconShipping,
} from '../icons';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { adminRouteMotion } from '../motion/adminMotion';
import { PREMIUM_EASE } from '../motion/variants';
import { AdminAmbientBackground } from '../components/admin/premium/AdminAmbientBackground';

const DRAWER_EXPANDED = 276;
const DRAWER_COLLAPSED = 88;

const links = [
  { to: '/admin', label: 'Overview', icon: <IconDashboard fontSize="small" /> },
  { to: '/admin/products', label: 'Products', icon: <IconInventory fontSize="small" /> },
  { to: '/admin/jewellery-combos', label: 'Jewellery combos', icon: <IconInventory fontSize="small" /> },
  { to: '/admin/orders', label: 'Orders', icon: <IconShipping fontSize="small" /> },
  { to: '/admin/reviews', label: 'Reviews', icon: <IconReviews fontSize="small" /> },
];

export function AdminShell() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const reduced = useReducedMotion();
  const routeMotion = adminRouteMotion(reduced);

  const drawerWidth = isMdUp && sidebarCollapsed ? DRAWER_COLLAPSED : DRAWER_EXPANDED;

  const navButtonSx = (selected: boolean) => ({
    position: 'relative' as const,
    cursor: 'pointer',
    borderRadius: 2,
    mx: 0.75,
    px: sidebarCollapsed && isMdUp ? 0 : 1.25,
    py: 1,
    minHeight: 48,
    justifyContent: sidebarCollapsed && isMdUp ? 'center' : 'flex-start',
    overflow: 'hidden',
    border: '1px solid transparent',
    bgcolor: selected ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
    transition: theme.transitions.create(['background-color', 'border-color', 'padding'], {
      duration: reduced ? 0 : 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }),
    '&:hover': {
      bgcolor: selected ? alpha(theme.palette.primary.main, 0.16) : alpha(theme.palette.primary.main, 0.06),
      borderColor: alpha(theme.palette.primary.main, 0.12),
    },
  });

  const drawer = (
    <Box component="nav" sx={{ pt: 2, pb: 2, display: 'flex', flexDirection: 'column', height: '100%' }} aria-label="Administration">
      <Typography
        variant="caption"
        sx={{
          px: sidebarCollapsed && isMdUp ? 1 : 2.25,
          pb: 1.5,
          color: 'text.secondary',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 600,
          opacity: sidebarCollapsed && isMdUp ? 0 : 1,
          transition: reduced ? 'none' : 'opacity 0.25s ease',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {sidebarCollapsed && isMdUp ? ' ' : 'Administration'}
      </Typography>
        <List dense disablePadding sx={{ flex: 1 }}>
          {links.map((l, i) => {
            const selected =
              l.to === '/admin'
                ? location.pathname === '/admin'
                : location.pathname === l.to || location.pathname.startsWith(`${l.to}/`);
            const button = (
              <ListItemButton
                component={RouterLink}
                to={l.to}
                selected={false}
                aria-current={selected ? 'page' : undefined}
                onClick={() => setMobileOpen(false)}
                sx={navButtonSx(selected)}
              >
                <Box
                  sx={{
                    mr: sidebarCollapsed && isMdUp ? 0 : 1.25,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'primary.main',
                    zIndex: 1,
                  }}
                >
                  {l.icon}
                </Box>
                <ListItemText
                  primary={l.label}
                  sx={{
                    zIndex: 1,
                    m: 0,
                    display: sidebarCollapsed && isMdUp ? 'none' : 'block',
                    '& .MuiListItemText-primary': {
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                    },
                  }}
                />
              </ListItemButton>
            );

            const wrapped =
              sidebarCollapsed && isMdUp ? (
                <Tooltip title={l.label} placement="right" enterDelay={200}>
                  <span style={{ display: 'block' }}>{button}</span>
                </Tooltip>
              ) : (
                button
              );

            return (
              <ListItem
                key={l.to}
                disablePadding
                component={motion.li}
                initial={reduced ? false : { opacity: 0, x: -12, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: reduced ? 0 : 0.45,
                  delay: reduced ? 0 : i * 0.07,
                  ease: PREMIUM_EASE,
                }}
                sx={{ display: 'block', mb: 0.35, px: 0.5 }}
              >
                {wrapped}
              </ListItem>
            );
          })}
        </List>
      <List dense disablePadding sx={{ mt: 'auto', pt: 1 }}>
        <ListItem
          disablePadding
          component={motion.li}
          initial={reduced ? false : { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: reduced ? 0 : 0.45,
            delay: reduced ? 0 : links.length * 0.07,
            ease: PREMIUM_EASE,
          }}
          sx={{ display: 'block', px: 0.5 }}
        >
          {sidebarCollapsed && isMdUp ? (
            <Tooltip title="Sign out" placement="right">
              <span style={{ display: 'block' }}>
                <ListItemButton
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  sx={{
                    ...navButtonSx(false),
                    color: 'text.secondary',
                    justifyContent: 'center',
                    px: 0,
                  }}
                >
                  <IconLogout fontSize="small" />
                </ListItemButton>
              </span>
            </Tooltip>
          ) : (
            <ListItemButton
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              sx={{
                ...navButtonSx(false),
                color: 'text.secondary',
              }}
            >
              <Box sx={{ mr: 1.25, display: 'flex', alignItems: 'center' }}>
                <IconLogout fontSize="small" />
              </Box>
              <ListItemText primary="Sign out" />
            </ListItemButton>
          )}
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {!isMdUp && (
        <AppBar
          position="fixed"
          color="inherit"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: (t) => alpha(t.palette.background.paper, 0.75),
            backdropFilter: reduced ? 'none' : 'blur(18px)',
          }}
        >
          <Toolbar sx={{ minHeight: { xs: 56 } }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              sx={{ cursor: 'pointer', mr: 1, color: 'text.primary' }}
            >
              <IconMenu />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontFamily: theme.typography.h5.fontFamily }}>
              Admin
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant={isMdUp ? 'permanent' : 'temporary'}
        open={isMdUp ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        transitionDuration={reduced ? 0 : { enter: 280, exit: 220 }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            duration: reduced ? 0 : 360,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }),
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
            backgroundColor: (t) => alpha(t.palette.background.paper, 0.82),
            backdropFilter: reduced ? 'none' : 'blur(20px)',
            transition: theme.transitions.create('width', {
              duration: reduced ? 0 : 360,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }),
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar
          sx={{
            display: isMdUp ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            gap: 1,
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: { sm: 64 },
            px: sidebarCollapsed ? 0.5 : 2,
          }}
        >
          {!sidebarCollapsed ? (
            <Typography variant="h6" fontWeight={800} sx={{ fontFamily: theme.typography.h5.fontFamily, letterSpacing: '-0.02em' }}>
              Paduchu Admin
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={800} sx={{ letterSpacing: '0.04em', color: 'primary.main' }}>
              PC
            </Typography>
          )}
          <Tooltip title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton
              size="small"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              sx={{
                cursor: 'pointer',
                color: 'text.secondary',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                borderRadius: 2,
              }}
            >
              {sidebarCollapsed ? <IconChevronRight fontSize="small" /> : <IconChevronLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          transition: theme.transitions.create('width', {
            duration: reduced ? 0 : 360,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }),
          position: 'relative',
          bgcolor: 'background.default',
        }}
      >
        <AdminAmbientBackground />
        {!isMdUp && <Toolbar />}
        <Container maxWidth="xl" sx={{ py: { xs: 2.5, sm: 3.5 }, px: { xs: 2, sm: 3 }, position: 'relative', zIndex: 1 }}>
          <AnimatePresence mode="sync">
            <motion.div key={location.pathname} {...routeMotion} style={{ width: '100%' }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Container>
      </Box>
    </Box>
  );
}
