import { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import { motion } from 'framer-motion';
import { alpha, useTheme } from '@mui/material/styles';
import { AdminPageHeader, AnimatedTable, PageTransitionWrapper } from '../../components/admin/premium';
import { apiFetch } from '../../api/client';
import { formatInrFromPaise } from '../../utils/format';
import { AdminLoadingPlaceholder } from '../../components/admin/AdminLoadingPlaceholder';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { PREMIUM_EASE } from '../../motion/variants';

type AdminOrderItem = {
  productId?: string;
  name: string;
  price: number;
  qty: number;
};

type AdminOrder = {
  id: string;
  status: string;
  amount: number;
  items?: AdminOrderItem[];
  user?: { email?: string; name?: string };
  createdAt: string;
};

function formatOrderItemSummary(items: AdminOrderItem[] | undefined): string {
  if (!items?.length) return '—';
  return items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(', ');
}

const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] as const;

const ADMIN_STATUS_LABEL: Record<(typeof statuses)[number], string> = {
  pending: 'Payment pending',
  paid: 'Order placed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const MotionTableRow = motion.create(TableRow);

function statusChipColor(status: string): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' {
  const s = status.toLowerCase();
  if (s === 'delivered') return 'success';
  if (s === 'cancelled') return 'error';
  if (s === 'shipped' || s === 'processing') return 'info';
  if (s === 'paid') return 'primary';
  if (s === 'pending') return 'warning';
  return 'default';
}

export function AdminOrdersPage() {
  const theme = useTheme();
  const reduced = useReducedMotion();
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

  if (loading) return <AdminLoadingPlaceholder variant="list" />;

  return (
    <PageTransitionWrapper>
      <Stack spacing={2.5}>
        <AdminPageHeader
          title="Orders"
          description="Track payment and fulfilment states. Updates persist through the admin orders API."
        />
        <Typography variant="body2" color="text.secondary">
          Showing {orders.length} order{orders.length === 1 ? '' : 's'}
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <AnimatedTable maxHeight={640}>
          <Table size="small" stickyHeader sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.background.paper, 0.95), backdropFilter: 'blur(8px)' }}>
                  Amount
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.background.paper, 0.95),
                    minWidth: 200,
                    maxWidth: 320,
                  }}
                >
                  Items
                </TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.background.paper, 0.95) }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.background.paper, 0.95) }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.background.paper, 0.95) }}>Placed</TableCell>
                <TableCell sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.background.paper, 0.95), minWidth: 220 }}>
                  Update
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o, rowIdx) => (
                <MotionTableRow
                  key={o.id}
                  initial={reduced ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: reduced ? 0 : Math.min(rowIdx * 0.05, 0.45),
                    duration: reduced ? 0 : 0.42,
                    ease: PREMIUM_EASE,
                  }}
                  hover
                  sx={{
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <TableCell>
                    <Typography fontWeight={800}>{formatInrFromPaise(o.amount)}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, verticalAlign: 'top' }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      title={formatOrderItemSummary(o.items)}
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {formatOrderItemSummary(o.items)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        (statuses as readonly string[]).includes(o.status)
                          ? ADMIN_STATUS_LABEL[o.status as (typeof statuses)[number]]
                          : o.status
                      }
                      size="small"
                      color={statusChipColor(o.status)}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {o.user?.email ?? '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.user?.name ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(o.createdAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      select
                      label="Status"
                      size="small"
                      value={o.status}
                      onChange={(e) => void updateStatus(o.id, e.target.value as (typeof statuses)[number])}
                      sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {statuses.map((s) => (
                        <MenuItem key={s} value={s}>
                          {ADMIN_STATUS_LABEL[s]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                </MotionTableRow>
              ))}
            </TableBody>
          </Table>
        </AnimatedTable>

        {orders.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">No orders yet.</Typography>
          </Box>
        ) : null}
      </Stack>
    </PageTransitionWrapper>
  );
}
