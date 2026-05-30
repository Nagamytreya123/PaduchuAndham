import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Rating from '@mui/material/Rating';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
import { apiFetch } from '../../api/client';
import { formatInrFromPaise } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { shopSurface } from '../../constants/shopSurface';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../../utils/productImage';

type LineReview = {
  canSubmit: boolean;
  alreadyReviewed: boolean;
  myRating?: number;
};

type OrderLine = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string | null;
  review?: LineReview;
};

type OrderRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  items?: OrderLine[];
};

const ORDER_STATUS: Record<
  string,
  { label: string; sub: string; icon: string }
> = {
  pending: { label: 'Payment pending', sub: 'Complete checkout to confirm your order', icon: '⏳' },
  paid: { label: 'Order placed', sub: 'We have received your payment', icon: '🛒' },
  processing: { label: 'Processing', sub: 'We are preparing your items', icon: '📦' },
  shipped: { label: 'Shipped', sub: 'Your order is on the way', icon: '🚚' },
  delivered: { label: 'Delivered', sub: 'How was your purchase?', icon: '✓' },
  cancelled: { label: 'Cancelled', sub: 'This order was cancelled', icon: '—' },
};

function lineProductId(line: OrderLine): string {
  const raw = line.productId as unknown;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'toString' in raw) return String(raw);
  return String(raw);
}

/** Status headline on white inset panel — dark tones for contrast on cream pages. */
function statusLabelColor(status: string): string {
  switch (status) {
    case 'delivered':
    case 'shipped':
      return '#1e5631';
    case 'paid':
    case 'processing':
      return '#5c4a1f';
    case 'pending':
      return '#8a5a12';
    case 'cancelled':
      return '#8b2e2e';
    default:
      return shopSurface.ink;
  }
}

function formatOrderWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: 'short', dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function OrderLineThumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onError={handleProductImageError}
        sx={{
          width: 72,
          height: 72,
          borderRadius: 1,
          objectFit: 'cover',
          flexShrink: 0,
          bgcolor: '#E8E8E8',
          border: '1px solid rgba(5, 11, 24, 0.08)',
        }}
      />
    );
  }
  return (
    <Box
      component="img"
      src={PRODUCT_IMAGE_FALLBACK}
      alt=""
      aria-hidden
      sx={{
        width: 72,
        height: 72,
        borderRadius: 1,
        objectFit: 'cover',
        flexShrink: 0,
        bgcolor: '#E8E8E8',
        border: '1px solid rgba(5, 11, 24, 0.08)',
      }}
    />
  );
}

type QuickReviewState = { productId: string; productName: string; rating: number };

function OrderQuickReviewDialog({
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
      <DialogTitle>Write a review</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {initial?.productName}
          </Typography>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
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
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function OrdersPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickReview, setQuickReview] = useState<QuickReviewState | null>(null);

  const reloadOrders = useCallback(async () => {
    const data = await apiFetch<{ orders: OrderRow[] }>('/api/orders/mine');
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

  if (loading) {
    return (
      <Stack spacing={2} sx={{ width: '100%' }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={280} />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2 }} />
      </Stack>
    );
  }

  return (
    <>
      <Stack spacing={3} sx={{ width: '100%', pb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          gap={2}
        >
          <Stack spacing={0.75}>
            <Button
              component={RouterLink}
              to="/account"
              variant="text"
              size="small"
              sx={{
                alignSelf: 'flex-start',
                px: 0,
                minWidth: 0,
                fontWeight: 600,
                mb: -0.5,
                color: shopSurface.inkMuted,
              }}
            >
              ← Account
            </Button>
            <Typography component="h1" sx={shopSurface.pageTitle}>
              My orders
            </Typography>
            <Typography variant="body2" sx={{ color: shopSurface.inkMuted }}>
              Track shipments and rate products after your order is marked <strong>delivered</strong>.
            </Typography>
            {user && (
              <Typography variant="caption" sx={{ color: shopSurface.inkMuted }}>
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
                borderColor: 'rgba(5, 11, 24, 0.2)',
                color: shopSurface.ink,
              }}
            >
              Log out
            </Button>
          )}
        </Stack>

        {orders.length === 0 ? (
          <Typography sx={{ color: shopSurface.inkMuted }}>No orders yet.</Typography>
        ) : (
          orders.map((o) => {
            const meta = ORDER_STATUS[o.status] ?? {
              label: o.status,
              sub: '',
              icon: '•',
            };
            return (
              <Paper
                key={o.id}
                elevation={0}
                sx={{
                  ...shopSurface.card,
                  p: 2,
                  overflow: 'hidden',
                }}
              >
                <Box sx={shopSurface.insetPanel}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <Stack direction="row" gap={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Typography
                        component="span"
                        sx={{ fontSize: '1.35rem', lineHeight: 1.2, flexShrink: 0 }}
                        aria-hidden
                      >
                        {meta.icon}
                      </Typography>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontFamily: shopSurface.font.display,
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            color: statusLabelColor(o.status),
                            lineHeight: 1.3,
                          }}
                        >
                          {meta.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.35, lineHeight: 1.45 }}>
                          {meta.sub}
                        </Typography>
                        <Typography variant="caption" sx={{ color: shopSurface.inkMuted, display: 'block', mt: 0.75 }}>
                          {formatOrderWhen(o.createdAt)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography
                      sx={{
                        flexShrink: 0,
                        fontFamily: shopSurface.font.display,
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        color: shopSurface.ink,
                      }}
                    >
                      {formatInrFromPaise(o.amount)}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'ui-monospace, monospace',
                      wordBreak: 'break-all',
                      display: 'block',
                      mt: 1.25,
                      color: shopSurface.inkMuted,
                    }}
                  >
                    Order #{o.id.slice(-8).toUpperCase()}
                  </Typography>
                </Box>

                {(o.items?.length ?? 0) > 0 && (
                  <Stack spacing={1.5} sx={{ pt: 2 }}>
                    {o.items!.map((line, idx) => {
                      const pid = lineProductId(line);
                      const showReview = o.status === 'delivered' && line.review;
                      return (
                        <Paper
                          key={`${o.id}-${pid}-${idx}`}
                          elevation={0}
                          sx={{
                            ...shopSurface.insetPanel,
                            p: 0,
                            overflow: 'hidden',
                          }}
                        >
                          <ListItemButton
                            component={RouterLink}
                            to={`/products/${pid}`}
                            alignItems="center"
                            sx={{
                              py: 1.5,
                              px: 1.5,
                              gap: 2,
                              color: shopSurface.ink,
                              '&:hover': { bgcolor: 'rgba(5, 11, 24, 0.04)' },
                            }}
                          >
                            <OrderLineThumb src={line.image} alt={line.name} />
                            <ListItemText
                              primary={line.name}
                              secondary={`Qty ${line.qty} · ${formatInrFromPaise(line.price)} each`}
                              primaryTypographyProps={{
                                fontWeight: 600,
                                variant: 'body2',
                                sx: { lineHeight: 1.35, color: shopSurface.ink, fontFamily: shopSurface.font.body },
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                sx: { color: shopSurface.inkMuted },
                              }}
                            />
                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 300, color: shopSurface.inkMuted }} aria-hidden>
                              ›
                            </Typography>
                          </ListItemButton>

                          {showReview && line.review && (
                            <Box
                              sx={{
                                px: 2,
                                py: 1.75,
                                borderTop: '1px solid',
                                borderColor: 'divider',
                                bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
                              }}
                            >
                              <Stack alignItems="center" spacing={1.25}>
                                <Typography variant="caption" fontWeight={800} color="secondary.dark" letterSpacing={0.5}>
                                  RATE & REVIEW
                                </Typography>
                                {line.review.alreadyReviewed && line.review.myRating != null ? (
                                  <>
                                    <Rating value={line.review.myRating} readOnly size="large" />
                                    <Typography variant="caption" color="text.secondary">
                                      Thanks for your feedback
                                    </Typography>
                                  </>
                                ) : (
                                  <>
                                    <Rating
                                      name={`order-rate-${o.id}-${pid}`}
                                      defaultValue={5}
                                      size="large"
                                      onChange={(_, v) => {
                                        if (v != null) {
                                          setQuickReview({ productId: pid, productName: line.name, rating: v });
                                        }
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ px: 1 }}>
                                      Share your experience — it helps other shoppers
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      onClick={() =>
                                        setQuickReview({ productId: pid, productName: line.name, rating: 5 })
                                      }
                                    >
                                      Write review
                                    </Button>
                                  </>
                                )}
                              </Stack>
                            </Box>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Paper>
            );
          })
        )}

        <Button
          component={RouterLink}
          variant="text"
          to="/shop"
          sx={{ alignSelf: 'flex-start', color: shopSurface.ink, fontWeight: 600 }}
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
