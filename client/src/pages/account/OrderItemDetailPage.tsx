import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { LuxuryShowcaseLoader } from '../../components/loading';
import { formatInrFromPaise } from '../../utils/format';
import { shopSurface } from '../../constants/shopSurface';
import { editorialFrameSx } from '../../constants/shopSurface';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../../utils/productImage';
import {
  DeliveryStatusBanner,
  findOrderLine,
  formatOrderRef,
  MoreItemsInOrderBanner,
  MyntraItemRatingBox,
  OrderBackNav,
  OrderQuickReviewDialog,
  orderDetailPath,
  orderTypography,
  QuickReviewState,
  useOrderDetail,
} from './orderShared';

function ItemHeroImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const imageSrc = src || PRODUCT_IMAGE_FALLBACK;
  return (
    <Box
      sx={{
        ...editorialFrameSx.root,
        borderRadius: 2,
        border: '1px solid rgba(40, 44, 63, 0.08)',
        maxWidth: 280,
        mx: 'auto',
      }}
    >
      <Box
        component="img"
        src={imageSrc}
        alt={alt}
        onError={handleProductImageError}
        sx={editorialFrameSx.img}
      />
    </Box>
  );
}

export function OrderItemDetailPage() {
  const { orderId, productId } = useParams<{ orderId: string; productId: string }>();
  const { order, loading, error, reload } = useOrderDetail(orderId);
  const [quickReview, setQuickReview] = useState<QuickReviewState | null>(null);

  if (loading) {
    return <LuxuryShowcaseLoader variant="inline" tone="light" aria-label="Loading item" />;
  }

  if (error || !order || !productId) {
    return (
      <Stack spacing={2}>
        <OrderBackNav to="/account/orders" label="My orders" />
        <Typography sx={{ color: orderTypography.muted }}>{error ?? 'Item not found'}</Typography>
      </Stack>
    );
  }

  const match = findOrderLine(order, productId);
  if (!match) {
    return (
      <Stack spacing={2}>
        <OrderBackNav to="/account/orders" label="My orders" />
        <Typography sx={{ color: orderTypography.muted }}>This item is not part of the order.</Typography>
        <Button component={RouterLink} to={orderDetailPath(order.id)} sx={shopSurface.cta}>
          View order
        </Button>
      </Stack>
    );
  }

  const { line } = match;
  const lineTotal = line.price * line.qty;
  const items = order.items ?? [];

  return (
    <>
      <Stack spacing={2.5} sx={{ width: '100%', pb: 3, fontFamily: orderTypography.fontFamily }}>
        <Stack spacing={0.75}>
          <OrderBackNav to="/account/orders" label="My orders" />
          <Typography component="h1" sx={{ ...orderTypography.sectionTitle, fontSize: { xs: '1.5rem', sm: '1.65rem' } }}>
            Order details
          </Typography>
        </Stack>

        <ItemHeroImage src={line.image} alt={line.name} />

        <Stack
          spacing={0.5}
          sx={{
            width: '100%',
            maxWidth: 320,
            mx: 'auto',
            alignItems: 'center',
            textAlign: 'center',
            px: 1,
          }}
        >
          <Typography
            sx={{
              ...orderTypography.productName,
              fontSize: '1rem',
              textAlign: 'center',
              width: '100%',
            }}
          >
            {line.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: orderTypography.muted,
              fontFamily: orderTypography.fontFamily,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              textAlign: 'center',
            }}
          >
            Quantity: {line.qty} · {formatInrFromPaise(line.price)} each
          </Typography>
          <Typography
            sx={{
              ...orderTypography.amount,
              fontSize: '1.05rem',
              mt: 0.25,
              textAlign: 'center',
            }}
          >
            {formatInrFromPaise(lineTotal)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: orderTypography.muted,
              fontFamily: orderTypography.fontFamily,
              letterSpacing: '0.04em',
              mt: 0.5,
              textTransform: 'uppercase',
              textAlign: 'center',
              wordBreak: 'break-all',
            }}
          >
            {formatOrderRef(order.id)}
          </Typography>
        </Stack>

        <DeliveryStatusBanner status={order.status} createdAt={order.createdAt} />

        <MoreItemsInOrderBanner orderId={order.id} items={items} currentProductId={productId} />

        <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 1.5, border: '1px solid rgba(40, 44, 63, 0.1)' }}>
          <MyntraItemRatingBox
            orderId={order.id}
            productId={productId}
            line={line}
            orderStatus={order.status}
            onRate={setQuickReview}
          />
        </Paper>

        <Button
          component={RouterLink}
          to={orderDetailPath(order.id)}
          fullWidth
          variant="outlined"
          sx={{
            borderColor: 'rgba(40, 44, 63, 0.2)',
            color: orderTypography.ink,
            fontWeight: 600,
            py: 1.25,
            fontFamily: orderTypography.fontFamily,
          }}
        >
          View full order & delivery info
        </Button>

        <Button
          component={RouterLink}
          to={`/products/${productId}`}
          variant="text"
          sx={{
            alignSelf: 'center',
            color: orderTypography.ink,
            fontWeight: 600,
            fontFamily: orderTypography.fontFamily,
          }}
        >
          View product page
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
