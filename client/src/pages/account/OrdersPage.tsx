import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { apiFetch } from '../../api/client';
import { formatInrFromPaise } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

type OrderRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
};

export function OrdersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ orders: OrderRow[] }>('/api/orders/mine');
        setOrders(data.orders);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Typography>Loading orders…</Typography>;

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'flex-start' }}
        gap={2}
      >
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            Your orders
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary">
              Signed in as {user.email}
            </Typography>
          )}
        </Stack>
        {user && (
          <Button variant="outlined" color="inherit" onClick={() => void handleLogout()} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
            Log out
          </Button>
        )}
      </Stack>

      {orders.length === 0 ? (
        <Typography color="text.secondary">No orders yet.</Typography>
      ) : (
        orders.map((o) => (
          <Paper key={o.id} sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography fontWeight={700}>{formatInrFromPaise(o.amount)}</Typography>
                <Chip label={o.status} size="small" color={o.status === 'paid' ? 'success' : 'default'} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {new Date(o.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Order id: {o.id}
              </Typography>
            </Stack>
          </Paper>
        ))
      )}

      <Button component={RouterLink} variant="text" to="/">
        Continue shopping
      </Button>
    </Stack>
  );
}
