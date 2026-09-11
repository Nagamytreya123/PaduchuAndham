import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';
import { apiFetch } from '../api/client';
import type { ValidatedCoupon } from '../types/coupon';
import {
  clearStoredCouponCode,
  normalizeCouponCode,
  readStoredCouponCode,
  writeStoredCouponCode,
} from '../utils/coupon';
import { cartItemsForCouponApi } from '../utils/couponEligibility';
import { formatInrFromPaise } from '../utils/format';
import { shopSurface } from '../constants/shopSurface';
import { IconCoupon, IconClose } from '../icons';

type CouponCodeFieldProps = {
  subtotalPaise: number;
  applied: ValidatedCoupon | null;
  onAppliedChange: (coupon: ValidatedCoupon | null) => void;
  /** Bumped on each promo-banner or parent-triggered apply so repeat applies work. */
  applyRequest?: { code: string; requestId: number } | null;
  disabled?: boolean;
  cartItems?: ReturnType<typeof cartItemsForCouponApi>;
};

export function CouponCodeField({
  subtotalPaise,
  applied,
  onAppliedChange,
  applyRequest = null,
  disabled = false,
  cartItems = [],
}: CouponCodeFieldProps) {
  const [code, setCode] = useState(() => readStoredCouponCode());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialApplied = useRef(false);

  useEffect(() => {
    if (!applyRequest || disabled) return;
    setCode(applyRequest.code);
    void applyCode(applyRequest.code, { silent: true });
  }, [applyRequest?.requestId, disabled]);

  useEffect(() => {
    if (applyRequest || applied || initialApplied.current || disabled) return;
    const stored = readStoredCouponCode();
    if (!stored) return;
    initialApplied.current = true;
    setCode(stored);
    void applyCode(stored, { silent: true });
  }, [applied, applyRequest, subtotalPaise, disabled]);

  useEffect(() => {
    if (!applied || disabled) return;
    if (applied.subtotalPaise !== subtotalPaise) {
      void revalidate(applied.code);
    }
  }, [subtotalPaise, disabled]);

  async function revalidate(rawCode: string) {
    const normalized = normalizeCouponCode(rawCode);
    if (!normalized || disabled) {
      onAppliedChange(null);
      clearStoredCouponCode();
      return;
    }
    try {
      const res = await apiFetch<{ coupon: ValidatedCoupon }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: normalized, subtotalPaise, items: cartItems }),
      });
      onAppliedChange(res.coupon);
      writeStoredCouponCode(res.coupon.code);
      setError(null);
    } catch {
      onAppliedChange(null);
      clearStoredCouponCode();
    }
  }

  async function applyCode(raw?: string, options?: { silent?: boolean }) {
    const normalized = normalizeCouponCode(raw ?? code);
    if (disabled) return;
    if (!normalized) {
      if (!options?.silent) setError('Enter a coupon code');
      return;
    }
    setBusy(true);
    if (!options?.silent) setError(null);
    try {
      const res = await apiFetch<{ coupon: ValidatedCoupon }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: normalized, subtotalPaise, items: cartItems }),
      });
      onAppliedChange(res.coupon);
      writeStoredCouponCode(res.coupon.code);
      setCode(res.coupon.code);
    } catch (e) {
      onAppliedChange(null);
      clearStoredCouponCode();
      if (!options?.silent) {
        setError(e instanceof Error ? e.message : 'Invalid coupon');
      } else {
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  }

  function removeCoupon() {
    onAppliedChange(null);
    clearStoredCouponCode();
    setCode('');
    setError(null);
  }

  if (disabled) return null;

  if (applied) {
    return (
      <Stack
        spacing={1}
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha('#14958f', 0.08),
          border: `1px solid ${alpha('#14958f', 0.2)}`,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <IconCoupon sx={{ fontSize: 20, color: '#0f7a75' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, color: shopSurface.ink, fontFamily: shopSurface.font.body }}>
                {applied.code}
              </Typography>
              <Typography variant="body2" sx={{ color: shopSurface.inkMuted }}>
                {applied.discountLabel} applied · save{' '}
                <Box component="span" sx={shopSurface.amount}>
                  {formatInrFromPaise(applied.discountPaise)}
                </Box>
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            color="inherit"
            onClick={removeCoupon}
            startIcon={<IconClose fontSize="small" />}
            sx={{ flexShrink: 0, color: shopSurface.inkMuted }}
          >
            Remove
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          size="small"
          icon={<IconCoupon sx={{ fontSize: '16px !important' }} />}
          label="Have a coupon?"
          sx={{
            fontWeight: 700,
            bgcolor: alpha(shopSurface.ink, 0.05),
            color: shopSurface.ink,
          }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          inputProps={{ style: { letterSpacing: '0.08em', fontWeight: 700 } }}
          sx={shopSurface.lightField}
        />
        <Button
          variant="outlined"
          onClick={() => void applyCode()}
          disabled={busy || !code.trim()}
          sx={{
            flexShrink: 0,
            minWidth: { sm: 108 },
            borderColor: alpha(shopSurface.ink, 0.2),
            color: shopSurface.ink,
            fontWeight: 700,
          }}
        >
          {busy ? 'Checking…' : 'Apply'}
        </Button>
      </Stack>
      {error && (
        <Alert severity="warning" onClose={() => setError(null)} sx={{ py: 0.25 }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
