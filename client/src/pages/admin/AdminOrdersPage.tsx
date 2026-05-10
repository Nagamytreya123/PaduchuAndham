import { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { apiFetch } from '../../api/client';
import { formatInrFromPaise } from '../../utils/format';

type AdminOrder = {
  id: string;
  status: string;
  amount: number;
  user?: { email?: string; name?: string };
  createdAt: string;
};

const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const ADMIN_STATUS_LABEL: Record<(typeof statuses)[number], string> = {
  pending: 'Payment pending',
  paid: 'Order placed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiFetch<{ orders: AdminOrder[] }>('/api/admin/orders');
    setOrders(data.orders);
  }

  useEffect(() => {
    void (async () => {
      try {
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function updateStatus(id: string, status: (typeof statuses)[number]) {
    setError(null);
    try {
      await apiFetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  if (loading) return <Typography>Loading orders…</Typography>;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Orders
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {orders.map((o) => (
        <Paper key={o.id} sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
              <Typography fontWeight={700}>{formatInrFromPaise(o.amount)}</Typography>
              <Chip
                label={
                  (statuses as readonly string[]).includes(o.status)
                    ? ADMIN_STATUS_LABEL[o.status as (typeof statuses)[number]]
                    : o.status
                }
                size="small"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Customer: {o.user?.email ?? '—'} ({o.user?.name ?? '—'})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(o.createdAt).toLocaleString()}
            </Typography>
            <TextField
              select
              label="Update status"
              size="small"
              value={o.status}
              onChange={(e) => void updateStatus(o.id, e.target.value as (typeof statuses)[number])}
              sx={{ maxWidth: 280 }}
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {ADMIN_STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
