import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { IconChevronRight } from '../../icons';
import { apiFetch } from '../../api/client';
import { shopSurface } from '../../constants/shopSurface';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../../utils/productImage';
import {
  IconOrderCancelled,
  IconOrderDelivered,
  IconOrderPending,
  IconOrderPlaced,
  IconOrderProcessing,
  IconOrderRefunded,
  IconOrderShipped,
} from '../../icons';

/** Myntra-style order typography — clean sans-serif throughout order flows */
export const orderTypography = {
  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
  ink: '#282c3f',
  muted: '#696e79',
  status: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: '0.9375rem',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  meta: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#696e79',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
  },
  productName: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 1.35,
    color: '#282c3f',
  },
  sectionTitle: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#282c3f',
  },
  amount: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums lining-nums' as const,
  },
};

export type LineReview = {
  canSubmit: boolean;
  alreadyReviewed: boolean;
  myRating?: number;
};

export type OrderLine = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string | null;
  review?: LineReview;
};

export type OrderAddress = {
  label?: string;
  recipientName?: string;
  recipientMobile?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type OrderDetail = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  items?: OrderLine[];
  address?: OrderAddress;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

export const ORDER_STATUS: Record<string, { label: string; sub: string }> = {
  pending: { label: 'Payment pending', sub: 'Complete checkout to confirm your order' },
  paid: { label: 'Order placed', sub: 'We have received your payment' },
  processing: { label: 'Processing', sub: 'We are preparing your items' },
  shipped: { label: 'Shipped', sub: 'Your order is on the way' },
  delivered: { label: 'Delivered', sub: 'How was your purchase?' },
  cancelled: { label: 'Cancelled', sub: 'This order was cancelled' },
  refunded: { label: 'Refunded', sub: 'Your refund has been processed' },
};

const STATUS_ICON_COLOR: Record<string, string> = {
  pending: '#e8a317',
  paid: '#696e79',
  processing: '#696e79',
  shipped: '#14958f',
  delivered: '#14958f',
  cancelled: '#d32f2f',
  refunded: '#ff5722',
};

export function statusIconColor(status: string): string {
  return STATUS_ICON_COLOR[status] ?? orderTypography.muted;
}

export function OrderStatusIcon({
  status,
  size = 22,
  color,
}: {
  status: string;
  size?: number;
  color?: string;
}) {
  const sx = { fontSize: size, color: color ?? statusIconColor(status) };
  switch (status) {
    case 'delivered':
      return <IconOrderDelivered sx={sx} />;
    case 'shipped':
      return <IconOrderShipped sx={sx} />;
    case 'processing':
      return <IconOrderProcessing sx={sx} />;
    case 'pending':
      return <IconOrderPending sx={sx} />;
    case 'cancelled':
      return <IconOrderCancelled sx={sx} />;
    case 'refunded':
      return <IconOrderRefunded sx={sx} />;
    case 'paid':
    default:
      return <IconOrderPlaced sx={sx} />;
  }
}

export function lineProductId(line: OrderLine): string {
  const raw = line.productId as unknown;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'toString' in raw) return String(raw);
  return String(raw);
}

export function statusLabelColor(status: string): string {
  switch (status) {
    case 'delivered':
    case 'shipped':
      return '#14958f';
    case 'paid':
    case 'processing':
      return '#696e79';
    case 'pending':
      return '#e8a317';
    case 'cancelled':
      return '#d32f2f';
    case 'refunded':
      return '#ff5722';
    default:
      return orderTypography.ink;
  }
}

export type OrderTimeGroup = {
  key: string;
  label: string;
  orders: OrderDetail[];
};

export function groupOrdersByPlacedAt(orders: OrderDetail[]): OrderTimeGroup[] {
  const map = new Map<string, OrderDetail[]>();

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key = Number.isNaN(d.getTime())
      ? order.createdAt
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(order);
    else map.set(key, [order]);
  }

  return [...map.entries()].map(([key, grouped]) => {
    const sample = grouped[0]!;
    const d = new Date(sample.createdAt);
    const when = Number.isNaN(d.getTime()) ? sample.createdAt : formatOrderWhen(sample.createdAt);
    const countLabel = grouped.length > 1 ? `${grouped.length} orders · ` : '';
    return {
      key,
      label: `${countLabel}${when}`,
      orders: grouped,
    };
  });
}

export function formatOrderWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  } catch {
    return iso;
  }
}

export function formatOrderDeliveredWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const date = d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `On ${date}, ${time}`;
  } catch {
    return iso;
  }
}

export function formatOrderRef(orderId: string) {
  if (orderId.length >= 15) {
    return `# ${orderId.slice(0, 7)} ${orderId.slice(7)}`;
  }
  return `# ${orderId.toUpperCase()}`;
}

export function findOrderLine(
  order: OrderDetail,
  productId: string,
): { line: OrderLine; index: number } | null {
  const items = order.items ?? [];
  const index = items.findIndex((line) => lineProductId(line) === productId);
  if (index < 0) return null;
  return { line: items[index], index };
}

export function itemDetailPath(orderId: string, productId: string) {
  return `/account/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(productId)}`;
}

export function orderDetailPath(orderId: string) {
  return `/account/orders/${encodeURIComponent(orderId)}`;
}

export function useOrderDetail(orderId: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!orderId) return;
    const data = await apiFetch<{ order: OrderDetail }>(`/api/orders/mine/${orderId}`);
    setOrder(data.order);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setError('Order not found');
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load order');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, reload]);

  return { order, loading, error, reload };
}

export function formatAddressBlock(address: OrderAddress): string[] {
  const lines: string[] = [];
  const name = address.recipientName?.trim();
  if (name) lines.push(name);
  lines.push(address.line1);
  if (address.line2?.trim()) lines.push(address.line2.trim());
  lines.push(`${address.city}, ${address.state} ${address.postalCode}`);
  const country = address.country?.trim();
  if (country && country !== 'IN') lines.push(country);
  return lines;
}

export function paymentMethodLabel(order: Pick<OrderDetail, 'status' | 'razorpayPaymentId'>): {
  label: string;
  detail?: string;
} {
  if (order.status === 'pending') {
    return { label: 'Payment pending', detail: 'Complete checkout to pay securely' };
  }
  if (order.status === 'cancelled') {
    return { label: 'Not charged', detail: 'This order was cancelled before payment' };
  }
  if (order.razorpayPaymentId) {
    return {
      label: 'Paid online',
      detail: 'UPI · Card · Net banking via Razorpay',
    };
  }
  return { label: 'Online payment', detail: 'Processed at checkout' };
}

export function sectionEyebrow(text: string) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: shopSurface.inkMuted,
        display: 'block',
        mb: 1.25,
      }}
    >
      {text}
    </Typography>
  );
}

type OrderLineThumbProps = {
  src: string | null | undefined;
  alt: string;
  size?: number;
};

export function OrderLineThumb({ src, alt, size = 72 }: OrderLineThumbProps) {
  const sx = {
    width: size,
    height: size,
    borderRadius: 1.25,
    objectFit: 'cover' as const,
    flexShrink: 0,
    bgcolor: '#E8E8E8',
    border: '1px solid rgba(5, 11, 24, 0.08)',
  };

  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleProductImageError}
        sx={sx}
      />
    );
  }
  return <Box component="img" src={PRODUCT_IMAGE_FALLBACK} alt="" aria-hidden sx={sx} />;
}

export type QuickReviewState = { productId: string; productName: string; rating: number };

export function OrderBackNav({ to, label }: { to: string; label: string }) {
  return (
    <Button
      component={RouterLink}
      to={to}
      variant="text"
      size="small"
      sx={{
        alignSelf: 'flex-start',
        px: 0,
        minWidth: 0,
        fontWeight: 600,
        color: orderTypography.muted,
        fontFamily: orderTypography.fontFamily,
      }}
    >
      ← {label}
    </Button>
  );
}

export function DeliveryStatusBanner({ status, createdAt }: { status: string; createdAt: string }) {
  const meta = ORDER_STATUS[status] ?? { label: status, sub: '' };
  const isDelivered = status === 'delivered';
  const isPositive = status === 'delivered' || status === 'shipped';

  return (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        borderRadius: 1.5,
        bgcolor: isPositive ? '#14958f' : '#ffffff',
        color: isPositive ? '#ffffff' : orderTypography.ink,
        border: isPositive ? 'none' : '1px solid rgba(5, 11, 24, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: isPositive ? 'rgba(255,255,255,0.18)' : `${statusIconColor(status)}18`,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <OrderStatusIcon status={status} size={20} color={isPositive ? '#ffffff' : undefined} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ ...orderTypography.status, color: 'inherit' }}>
            {isDelivered ? 'Item delivered' : meta.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.25,
              opacity: isPositive ? 0.88 : 1,
              color: isPositive ? 'inherit' : orderTypography.muted,
              fontFamily: orderTypography.fontFamily,
              textTransform: 'none',
              letterSpacing: 'normal',
            }}
          >
            {isDelivered ? formatOrderDeliveredWhen(createdAt) : meta.sub}
          </Typography>
        </Box>
      </Stack>
      {isDelivered && (
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '2px dashed rgba(255,255,255,0.55)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.55rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.9,
          }}
        >
          Delivered
        </Box>
      )}
    </Box>
  );
}

export function MoreItemsInOrderBanner({
  orderId,
  items,
  currentProductId,
}: {
  orderId: string;
  items: OrderLine[];
  currentProductId: string;
}) {
  const others = items.filter((line) => lineProductId(line) !== currentProductId);
  if (others.length === 0) return null;

  const nextItem = others[0]!;
  const nextProductId = lineProductId(nextItem);
  const label =
    others.length === 1
      ? '1 more item in this order'
      : `${others.length} more items in this order`;

  return (
    <Box
      component={RouterLink}
      to={itemDetailPath(orderId, nextProductId)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderRadius: 1.5,
        bgcolor: '#ffffff',
        border: '1px solid rgba(5, 11, 24, 0.1)',
        textDecoration: 'none',
        color: shopSurface.ink,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: shopSurface.creamDeep },
      }}
    >
      <Stack direction="row" spacing={-0.75}>
        {others.slice(0, 2).map((line, idx) => (
          <Box key={`${lineProductId(line)}-${idx}`} sx={{ zIndex: 2 - idx }}>
            <OrderLineThumb src={line.image} alt={line.name} size={40} />
          </Box>
        ))}
      </Stack>
      <Typography variant="body2" sx={{ flex: 1, fontWeight: 600, fontFamily: orderTypography.fontFamily }}>
        {label}
      </Typography>
      <IconChevronRight sx={{ fontSize: 20, color: orderTypography.muted, flexShrink: 0 }} />
    </Box>
  );
}

export function MyntraItemRatingBox({
  orderId,
  productId,
  line,
  orderStatus,
  onRate,
}: {
  orderId: string;
  productId: string;
  line: OrderLine;
  orderStatus: string;
  onRate: (state: QuickReviewState) => void;
}) {
  if (orderStatus !== 'delivered' || !line.review) return null;

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1.25,
        bgcolor: '#f4efff',
        borderTop: '1px solid rgba(40, 44, 63, 0.06)',
        display: 'flex',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {line.review.alreadyReviewed && line.review.myRating != null ? (
        <Rating value={line.review.myRating} readOnly size="medium" />
      ) : (
        <Rating
          name={`myntra-rate-${orderId}-${productId}`}
          defaultValue={0}
          size="medium"
          onChange={(_, v) => {
            if (v != null && v > 0) {
              onRate({ productId, productName: line.name, rating: v });
            }
          }}
        />
      )}
    </Box>
  );
}

/** @deprecated use MyntraItemRatingBox */
export function ItemRatingStrip({
  orderId,
  productId,
  line,
  orderStatus,
  onRate,
}: {
  orderId: string;
  productId: string;
  line: OrderLine;
  orderStatus: string;
  onRate: (state: QuickReviewState) => void;
}) {
  if (orderStatus !== 'delivered' || !line.review) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        ...shopSurface.insetPanel,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <OrderLineThumb src={line.image} alt={line.name} size={56} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: shopSurface.ink, mb: 0.75 }}>
            Rate this product
          </Typography>
          {line.review.alreadyReviewed && line.review.myRating != null ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Rating value={line.review.myRating} readOnly size="medium" />
              <Typography variant="caption" sx={{ color: shopSurface.inkMuted }}>
                Thanks!
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1}>
              <Rating
                name={`rate-${orderId}-${productId}`}
                defaultValue={5}
                size="medium"
                onChange={(_, v) => {
                  if (v != null) onRate({ productId, productName: line.name, rating: v });
                }}
              />
              <Button
                size="small"
                variant="text"
                onClick={() => onRate({ productId, productName: line.name, rating: 5 })}
                sx={{
                  alignSelf: 'flex-start',
                  px: 0,
                  minWidth: 0,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: shopSurface.ink,
                }}
              >
                Write a review
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export function OrderQuickReviewDialog({
  open,
  onClose,
  initial,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  initial: QuickReviewState | null;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initial) {
      setRating(initial.rating);
      setTitle('');
      setBody('');
      setError(null);
    }
  }, [open, initial]);

  async function handleSubmit() {
    if (!initial) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${initial.productId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: shopSurface.font.display }}>Write a review</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: shopSurface.inkMuted }}>
            {initial?.productName}
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ color: shopSurface.inkMuted }}>
              Your rating
            </Typography>
            <Rating value={rating} onChange={(_, v) => setRating(v ?? rating)} size="large" />
          </Stack>
          <TextField
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 200 }}
            fullWidth
            size="small"
            sx={shopSurface.lightField}
          />
          <TextField
            label="Review"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            multiline
            minRows={4}
            fullWidth
            helperText="At least 10 characters"
            sx={shopSurface.lightField}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={submitting || body.trim().length < 10}
          sx={shopSurface.cta}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
