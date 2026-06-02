import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { IconChevronRight } from '../../icons';
import { LuxuryShowcaseLoader } from '../../components/loading';
import { apiFetch } from '../../api/client';
import { formatInrFromPaise } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { shopSurface } from '../../constants/shopSurface';
import {
  formatOrderDeliveredWhen,
  formatOrderWhen,
  groupOrdersByPlacedAt,
  lineProductId,
  MyntraItemRatingBox,
  OrderDetail,
  OrderLine,
  OrderLineThumb,
  OrderQuickReviewDialog,
  orderDetailPath,
  ORDER_STATUS,
  OrderStatusIcon,
  orderTypography,
  QuickReviewState,
  statusLabelColor,
} from './orderShared';

function OrderListItemRow({
  order,
  line,
  idx,
  onRate,
}: {
  order: OrderDetail;
  line: OrderLine;
  idx: number;
  onRate: (state: QuickReviewState) => void;
}) {
  const pid = lineProductId(line);
  const detailTo = orderDetailPath(order.id);

  return (
    <Box sx={{ px: 2, pb: idx === (order.items?.length ?? 0) - 1 ? 2 : 1.5 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 1.5,
          border: '1px solid rgba(40, 44, 63, 0.1)',
          bgcolor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Box
          component={Link}
          to={detailTo}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            textDecoration: 'none',
            color: orderTypography.ink,
            '&:hover': { bgcolor: 'rgba(40, 44, 63, 0.03)' },
          }}
        >
          <OrderLineThumb src={line.image} alt={line.name} size={72} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={orderTypography.productName}>{line.name}</Typography>
            <Typography
              variant="caption"
              sx={{
                color: orderTypography.muted,
                display: 'block',
                mt: 0.35,
                fontFamily: orderTypography.fontFamily,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Qty {line.qty} · {formatInrFromPaise(line.price)} each
            </Typography>
          </Box>
          <IconChevronRight sx={{ fontSize: 20, color: orderTypography.muted, flexShrink: 0 }} />
        </Box>

        <MyntraItemRatingBox
          orderId={order.id}
          productId={pid}
          line={line}
          orderStatus={order.status}
          onRate={onRate}
        />
      </Paper>
    </Box>
  );
}

function OrderCard({
  order,
  onRate,
}: {
  order: OrderDetail;
  onRate: (state: QuickReviewState) => void;
}) {
  const meta = ORDER_STATUS[order.status] ?? { label: order.status, sub: '' };
  const itemCount = order.items?.length ?? 0;
  const statusWhen =
    order.status === 'delivered'
      ? formatOrderDeliveredWhen(order.createdAt)
      : formatOrderWhen(order.createdAt);
  const detailTo = orderDetailPath(order.id);

  return (
    <Paper
      elevation={0}
      sx={{
        ...shopSurface.card,
        p: 0,
        overflow: 'hidden',
        fontFamily: orderTypography.fontFamily,
      }}
    >
      <Box
        component={Link}
        to={detailTo}
        sx={{
          display: 'block',
          px: 2,
          pt: 2,
          pb: 1.5,
          textDecoration: 'none',
          color: 'inherit',
          '&:hover': { bgcolor: 'rgba(40, 44, 63, 0.02)' },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <OrderStatusIcon status={order.status} size={22} />
              <Typography sx={{ ...orderTypography.status, color: statusLabelColor(order.status) }}>
                {meta.label}
              </Typography>
            </Stack>
            <Typography
              variant="caption"
              sx={{
                ...orderTypography.meta,
                display: 'block',
                mt: 0.75,
                textTransform: 'none',
              }}
            >
              {statusWhen}
            </Typography>
            {itemCount > 1 && (
              <Typography
                variant="caption"
                sx={{
                  color: orderTypography.muted,
                  display: 'block',
                  mt: 0.35,
                  fontFamily: orderTypography.fontFamily,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {itemCount} items · Order #{order.id.slice(-8).toUpperCase()}
              </Typography>
            )}
          </Box>
          <Typography sx={{ ...orderTypography.amount, fontSize: '1.05rem', flexShrink: 0 }}>
            {formatInrFromPaise(order.amount)}
          </Typography>
        </Stack>
      </Box>

      {itemCount > 0 && (
        <Stack sx={{ borderTop: '1px solid rgba(40, 44, 63, 0.08)' }}>
          {order.items!.map((line, idx) => (
            <OrderListItemRow
              key={`${order.id}-${lineProductId(line)}-${idx}`}
              order={order}
              line={line}
              idx={idx}
              onRate={onRate}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export function OrdersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickReview, setQuickReview] = useState<QuickReviewState | null>(null);

  const reloadOrders = useCallback(async () => {
    const data = await apiFetch<{ orders: OrderDetail[] }>('/api/orders/mine');
    setOrders(data.orders);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  useEffect(() => {
    void (async () => {
      try {
        await reloadOrders();
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadOrders]);

  const groups = groupOrdersByPlacedAt(orders);

  if (loading) {
    return <LuxuryShowcaseLoader variant="inline" tone="light" aria-label="Loading orders" />;
  }

  return (
    <>
      <Stack spacing={3} sx={{ width: '100%', pb: 2, fontFamily: orderTypography.fontFamily }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          gap={2}
        >
          <Stack spacing={0.75}>
            <Button
              component={Link}
              to="/account"
              variant="text"
              size="small"
              sx={{
                alignSelf: 'flex-start',
                px: 0,
                minWidth: 0,
                fontWeight: 600,
                mb: -0.5,
                color: orderTypography.muted,
                fontFamily: orderTypography.fontFamily,
              }}
            >
              ← Account
            </Button>
            <Typography
              component="h1"
              sx={{
                ...shopSurface.pageTitle,
                fontFamily: orderTypography.fontFamily,
                fontWeight: 700,
              }}
            >
              My orders
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: orderTypography.muted, fontFamily: orderTypography.fontFamily }}
            >
              Tap any order or item for full details.
            </Typography>
            {user && (
              <Typography
                variant="caption"
                sx={{ color: orderTypography.muted, fontFamily: orderTypography.fontFamily }}
              >
                {user.email}
              </Typography>
            )}
          </Stack>
          {user && (
            <Button
              variant="outlined"
              onClick={() => void handleLogout()}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
                borderColor: 'rgba(40, 44, 63, 0.2)',
                color: orderTypography.ink,
                fontFamily: orderTypography.fontFamily,
              }}
            >
              Log out
            </Button>
          )}
        </Stack>

        {orders.length === 0 ? (
          <Typography sx={{ color: orderTypography.muted }}>No orders yet.</Typography>
        ) : (
          groups.map((group) => (
            <Stack key={group.key} spacing={1.5}>
              <Typography
                sx={{
                  ...orderTypography.meta,
                  px: 0.5,
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: orderTypography.ink,
                }}
              >
                {group.label}
              </Typography>
              {group.orders.map((o) => (
                <OrderCard key={o.id} order={o} onRate={setQuickReview} />
              ))}
            </Stack>
          ))
        )}

        <Button
          component={Link}
          variant="text"
          to="/shop"
          sx={{
            alignSelf: 'flex-start',
            color: orderTypography.ink,
            fontWeight: 600,
            fontFamily: orderTypography.fontFamily,
          }}
        >
          Continue shopping
        </Button>
      </Stack>

      <OrderQuickReviewDialog
        open={quickReview != null}
        onClose={() => setQuickReview(null)}
        initial={quickReview}
        onSuccess={() => void reloadOrders()}
      />
    </>
  );
}
