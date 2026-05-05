import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import {
  IconDashboard,
  IconInventory,
  IconLogout,
  IconMenu,
  IconShipping,
} from '../icons';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 260;

const links = [
  { to: '/admin', label: 'Overview', icon: <IconDashboard fontSize="small" /> },
  { to: '/admin/products', label: 'Products', icon: <IconInventory fontSize="small" /> },
  { to: '/admin/orders', label: 'Orders', icon: <IconShipping fontSize="small" /> },
];

export function AdminShell() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const drawer = (
    <Box sx={{ pt: 2 }}>
      <Typography variant="subtitle2" sx={{ px: 2, pb: 1, color: 'text.secondary' }}>
        Administration
      </Typography>
      <List dense>
        {links.map((l) => {
          const selected =
            l.to === '/admin'
              ? location.pathname === '/admin'
              : location.pathname === l.to || location.pathname.startsWith(`${l.to}/`);
          return (
            <ListItemButton
              key={l.to}
              component={RouterLink}
              to={l.to}
              selected={selected}
              onClick={() => setOpen(false)}
            >
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>{l.icon}</Box>
            <ListItemText primaryTypographyProps={{ fontWeight: 600 }} primary={l.label} />
            </ListItemButton>
          );
        })}
      </List>
      <List dense sx={{ mt: 2 }}>
        <ListItemButton
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
            <IconLogout fontSize="small" />
          </Box>
          <ListItemText primary="Sign out" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {!isMdUp && (
        <AppBar position="fixed" color="inherit" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="menu">
              <IconMenu />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
              Admin
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        variant={isMdUp ? 'permanent' : 'temporary'}
        open={isMdUp ? true : open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        <Toolbar sx={{ display: isMdUp ? 'flex' : 'none' }}>
          <Typography variant="h6" fontWeight={800}>
            Paduchu Admin
          </Typography>
        </Toolbar>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, width: '100%', bgcolor: 'background.default' }}>
        {!isMdUp && <Toolbar />}
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
