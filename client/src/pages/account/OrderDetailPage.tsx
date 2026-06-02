import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import { IconChevronDown, IconChevronRight, IconLocationPin, IconPayment, IconPhone } from '../../icons';
import { LuxuryShowcaseLoader } from '../../components/loading';
import { formatInrFromPaise } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { shopSurface } from '../../constants/shopSurface';
import {
  formatAddressBlock,
  formatOrderRef,
  formatOrderWhen,
  itemDetailPath,
  lineProductId,
  MyntraItemRatingBox,
  OrderBackNav,
  OrderLine,
  OrderLineThumb,
  OrderQuickReviewDialog,
  ORDER_STATUS,
  OrderStatusIcon,
  orderTypography,
  paymentMethodLabel,
  QuickReviewState,
  sectionEyebrow,
  statusLabelColor,
  useOrderDetail,
} from './orderShared';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
      <Typography
        variant="body2"
        sx={{ color: orderTypography.muted, fontFamily: orderTypography.fontFamily, flex: 1, minWidth: 0 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ ...orderTypography.amount, color: orderTypography.ink, textAlign: 'right', flexShrink: 0 }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function AddressMapPlaceholder() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 72,
        height: 72,
        flexShrink: 0,
        borderRadius: 1.5,
        bgcolor: '#f5f5f6',
        border: '1px solid rgba(40, 44, 63, 0.1)',
        backgroundImage: 'linear-gradient(135deg, rgba(20,149,143,0.1) 0%, rgba(40,44,63,0.04) 100%)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <IconLocationPin sx={{ fontSize: 28, color: '#14958f' }} />
    </Box>
  );
}

function OrderDetailItemRow({
  orderId,
  orderStatus,
  line,
  onRate,
}: {
  orderId: string;
  orderStatus: string;
  line: OrderLine;
  onRate: (state: QuickReviewState) => void;
}) {
  const pid = lineProductId(line);

  return (
    <Box>
      <Box
        component={RouterLink}
        to={itemDetailPath(orderId, pid)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.75,
          textDecoration: 'none',
          color: orderTypography.ink,
          transition: 'background-color 0.2s',
          '&:hover': { bgcolor: 'rgba(40, 44, 63, 0.04)' },
        }}
      >
        <OrderLineThumb src={line.image} alt={line.name} size={64} />
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
        orderId={orderId}
        productId={pid}
        line={line}
        orderStatus={orderStatus}
        onRate={onRate}
      />
    </Box>
  );
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { order, loading, error, reload } = useOrderDetail(orderId);
  const [priceOpen, setPriceOpen] = useState(false);
  const [quickReview, setQuickReview] = useState<QuickReviewState | null>(null);

  if (loading) {
    return <LuxuryShowcaseLoader variant="inline" tone="light" aria-label="Loading order" />;
  }

  if (error || !order) {
    return (
      <Stack spacing={2}>
        <OrderBackNav to="/account/orders" label="My orders" />
        <Typography sx={{ color: orderTypography.muted }}>{error ?? 'Order not found'}</Typography>
        <Button component={RouterLink} to="/account/orders" sx={shopSurface.cta}>
          View all orders
        </Button>
      </Stack>
    );
  }

  const meta = ORDER_STATUS[order.status] ?? { label: order.status, sub: '' };
  const payment = paymentMethodLabel(order);
  const addressLines = order.address ? formatAddressBlock(order.address) : [];
  const contactName = order.address?.recipientName?.trim() || user?.name?.trim() || 'You';
  const contactPhone = order.address?.recipientMobile?.trim();
  const items = order.items ?? [];
  const itemSubtotal = items.reduce((sum, line) => sum + line.price * line.qty, 0);

  return (
    <>
      <Stack spacing={2.5} sx={{ width: '100%', pb: 3, fontFamily: orderTypography.fontFamily }}>
        <Stack spacing={0.75}>
          <OrderBackNav to="/account/orders" label="My orders" />
          <Typography
            component="h1"
            sx={{ ...orderTypography.sectionTitle, fontSize: { xs: '1.5rem', sm: '1.65rem' } }}
          >
            Order details
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: orderTypography.muted, fontFamily: orderTypography.fontFamily }}
          >
            {formatOrderWhen(order.createdAt)}
          </Typography>
        </Stack>

        <Paper elevation={0} sx={shopSurface.insetPanel}>
          {sectionEyebrow('Delivered to')}
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#f5f5f6',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '1rem' }} aria-hidden>
                👤
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, color: orderTypography.ink, fontFamily: orderTypography.fontFamily }}>
                {contactName}
              </Typography>
              {contactPhone && (
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.75 }}>
                  <IconPhone sx={{ fontSize: 16, color: orderTypography.muted }} />
                  <Typography
                    component="a"
                    href={`tel:${contactPhone.replace(/\s/g, '')}`}
                    variant="body2"
                    sx={{
                      color: orderTypography.ink,
                      textDecoration: 'none',
                      fontWeight: 500,
                      fontFamily: orderTypography.fontFamily,
                    }}
                  >
                    {contactPhone}
                  </Typography>
                </Stack>
              )}
              {user?.email && (
                <Typography
                  variant="caption"
                  sx={{ color: orderTypography.muted, display: 'block', mt: 0.5, fontFamily: orderTypography.fontFamily }}
                >
                  {user.email}
                </Typography>
              )}
            </Box>
          </Stack>

          {addressLines.length > 0 && (
            <>
              <Divider sx={{ my: 2, borderColor: 'rgba(40, 44, 63, 0.08)' }} />
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                    <IconLocationPin sx={{ fontSize: 18, color: orderTypography.muted, mt: 0.15, flexShrink: 0 }} />
                    <Stack spacing={0.25}>
                      {order.address?.label?.trim() && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: shopSurface.badge,
                            fontFamily: orderTypography.fontFamily,
                          }}
                        >
                          {order.address.label}
                        </Typography>
                      )}
                      {addressLines.map((line) => (
                        <Typography
                          key={line}
                          variant="body2"
                          sx={{ color: orderTypography.ink, lineHeight: 1.55, fontFamily: orderTypography.fontFamily }}
                        >
                          {line}
                        </Typography>
                      ))}
                    </Stack>
                  </Stack>
                </Box>
                <AddressMapPlaceholder />
              </Stack>
            </>
          )}
        </Paper>

        <Paper elevation={0} sx={shopSurface.insetPanel}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 600, color: orderTypography.ink, fontFamily: orderTypography.fontFamily }}>
              Total order price
            </Typography>
            <Typography sx={{ ...orderTypography.amount, fontSize: '1.1rem' }}>
              {formatInrFromPaise(order.amount)}
            </Typography>
          </Stack>

          <Button
            onClick={() => setPriceOpen((v) => !v)}
            fullWidth
            endIcon={
              <IconChevronDown
                sx={{
                  fontSize: 18,
                  color: orderTypography.muted,
                  transform: priceOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            }
            sx={{
              mt: 1,
              justifyContent: 'flex-end',
              px: 0,
              py: 0.5,
              minHeight: 0,
              color: orderTypography.muted,
              fontFamily: orderTypography.fontFamily,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: 'transparent', color: orderTypography.ink },
              '& .MuiButton-endIcon': { ml: 0.5 },
            }}
          >
            View breakup
          </Button>

          <Collapse in={priceOpen}>
            <Stack spacing={1.25} sx={{ pt: 1.5 }}>
              {items.map((line, idx) => (
                <DetailRow
                  key={`${lineProductId(line)}-${idx}`}
                  label={`${line.name} × ${line.qty}`}
                  value={formatInrFromPaise(line.price * line.qty)}
                />
              ))}
              {itemSubtotal !== order.amount && (
                <DetailRow label="Adjustments" value={formatInrFromPaise(order.amount - itemSubtotal)} />
              )}
              <DetailRow label="Shipping" value="Complimentary" />
            </Stack>
          </Collapse>

          <Box
            sx={{
              mt: 2,
              px: 1.5,
              py: 1.25,
              borderRadius: 1.25,
              bgcolor: '#f5f5f6',
              border: '1px solid rgba(40, 44, 63, 0.06)',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconPayment sx={{ fontSize: 20, color: orderTypography.muted }} />
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: orderTypography.ink, fontFamily: orderTypography.fontFamily }}
                >
                  {payment.label}
                </Typography>
                {payment.detail && (
                  <Typography
                    variant="caption"
                    sx={{ color: orderTypography.muted, fontFamily: orderTypography.fontFamily, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    {payment.detail}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ ...shopSurface.insetPanel, p: 0, overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
            <Typography sx={orderTypography.sectionTitle}>
              {items.length === 1 ? 'Item in this order' : 'Items in this order'}
            </Typography>
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
              Order ID {formatOrderRef(order.id)}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 1 }}>
              <OrderStatusIcon status={order.status} size={20} />
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: statusLabelColor(order.status), fontFamily: orderTypography.fontFamily }}
              >
                {meta.label}
              </Typography>
            </Stack>
          </Box>

          <Stack divider={<Divider sx={{ borderColor: 'rgba(40, 44, 63, 0.08)' }} />}>
            {items.map((line, idx) => (
              <OrderDetailItemRow
                key={`${order.id}-${lineProductId(line)}-${idx}`}
                orderId={order.id}
                orderStatus={order.status}
                line={line}
                onRate={setQuickReview}
              />
            ))}
          </Stack>

          <Box sx={{ px: 2, py: 1.75, borderTop: '1px solid rgba(40, 44, 63, 0.08)', bgcolor: '#f5f5f6' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: orderTypography.ink, fontFamily: orderTypography.fontFamily }}
              >
                Total amount
              </Typography>
              <Typography sx={{ ...orderTypography.amount, fontSize: '1.05rem' }}>
                {formatInrFromPaise(order.amount)}
              </Typography>
            </Stack>
          </Box>
        </Paper>

        {order.status === 'pending' && (
          <Button fullWidth onClick={() => navigate('/checkout')} sx={shopSurface.cta}>
            Complete payment
          </Button>
        )}

        <Button
          component={RouterLink}
          to="/shop"
          variant="text"
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
        onSuccess={() => void reload()}
      />
    </>
  );
}
