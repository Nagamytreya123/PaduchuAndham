import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { apiFetch } from '../api/client';
import type { CouponPromotion } from '../types/coupon';
import { promotionTeaser, qualifiesForCoupon, normalizeCouponCode } from '../utils/coupon';
import { cartItemsForCouponApi } from '../utils/couponEligibility';
import type { CartLine } from '../context/CartContext';
import { shopSurface } from '../constants/shopSurface';
import { IconCoupon } from '../icons';
import { useReducedMotion } from '../hooks/useReducedMotion';

type CouponPromoBannerProps = {
  subtotalPaise: number;
  cartLines?: CartLine[];
  onApplyCode?: (code: string) => void;
  appliedCouponCode?: string | null;
  compact?: boolean;
};

function promotionSubtotalPaise(promo: CouponPromotion, cartSubtotalPaise: number): number {
  return promo.eligibleSubtotalPaise ?? cartSubtotalPaise;
}

export function CouponPromoBanner({
  subtotalPaise,
  cartLines = [],
  onApplyCode,
  appliedCouponCode = null,
  compact = false,
}: CouponPromoBannerProps) {
  const reduced = useReducedMotion();
  const [promotions, setPromotions] = useState<CouponPromotion[]>([]);

  const cartItemsKey = useMemo(
    () => cartItemsForCouponApi(cartLines).map((item) => `${item.productId}:${item.qty}:${item.unitPricePaise}`).join('|'),
    [cartLines],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cartItems = cartItemsForCouponApi(cartLines);
        const res = await apiFetch<{ promotions: CouponPromotion[] }>('/api/coupons/promotions', {
          method: 'POST',
          body: JSON.stringify({ subtotalPaise, items: cartItems }),
        });
        if (!cancelled) setPromotions(res.promotions ?? []);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subtotalPaise, cartItemsKey]);

  const appliedCode = appliedCouponCode ? normalizeCouponCode(appliedCouponCode) : '';

  const visible = useMemo(() => {
    if (promotions.length === 0) return [];
    const available = promotions.filter(
      (p) => !appliedCode || normalizeCouponCode(p.code) !== appliedCode,
    );
    const eligible = available.filter((p) =>
      qualifiesForCoupon(promotionSubtotalPaise(p, subtotalPaise), p.minSubtotalPaise),
    );
    const upcoming = available.filter(
      (p) => !qualifiesForCoupon(promotionSubtotalPaise(p, subtotalPaise), p.minSubtotalPaise),
    );
    return [...eligible, ...upcoming].slice(0, compact ? 2 : 3);
  }, [promotions, subtotalPaise, compact, appliedCode]);

  if (visible.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      {visible.map((promo, index) => {
        const promoSubtotal = promotionSubtotalPaise(promo, subtotalPaise);
        const eligible = qualifiesForCoupon(promoSubtotal, promo.minSubtotalPaise);
        const message = promotionTeaser(promo, promoSubtotal);

        return (
          <Box
            key={promo.id}
            component={motion.div}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : index * 0.06 }}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
              px: compact ? 1.5 : 2,
              py: compact ? 1.25 : 1.5,
              bgcolor: eligible ? alpha('#14958f', 0.08) : alpha(shopSurface.ink, 0.04),
              border: `1px solid ${eligible ? alpha('#14958f', 0.22) : 'rgba(5, 11, 24, 0.1)'}`,
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background: eligible
                  ? 'linear-gradient(120deg, rgba(20,149,143,0.12) 0%, transparent 55%)'
                  : 'linear-gradient(120deg, rgba(5,11,24,0.04) 0%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: eligible ? alpha('#14958f', 0.14) : alpha(shopSurface.ink, 0.06),
                  color: eligible ? '#0f7a75' : shopSurface.inkMuted,
                }}
              >
                <IconCoupon sx={{ fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.35 }}>
                  <Typography
                    sx={{
                      fontFamily: shopSurface.font.display,
                      fontWeight: 700,
                      fontSize: compact ? '0.9rem' : '0.95rem',
                      color: shopSurface.ink,
                    }}
                  >
                    {promo.label}
                  </Typography>
                  <Chip
                    size="small"
                    label={promo.discountLabel}
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      bgcolor: eligible ? alpha('#14958f', 0.14) : alpha(shopSurface.ink, 0.06),
                      color: eligible ? '#0f7a75' : shopSurface.inkMuted,
                    }}
                  />
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted, lineHeight: 1.45 }}
                >
                  {message}
                </Typography>
                {eligible && onApplyCode && !appliedCode && (
                  <Typography
                    component="button"
                    type="button"
                    onClick={() => onApplyCode(promo.code)}
                    sx={{
                      mt: 0.75,
                      p: 0,
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                      fontFamily: shopSurface.font.body,
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      color: '#0f7a75',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                  >
                    Apply {promo.code}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
