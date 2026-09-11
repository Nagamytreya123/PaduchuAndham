import { useEffect, useMemo, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatInrFromPaise } from '../utils/format';
import { ShippingAddressFields } from '../components/ShippingAddressFields';
import { emptyShippingForm, type SavedAddressRow, type ShippingAddressForm } from '../types/address';
import { StorefrontPageShell } from '../components/StorefrontPageShell';
import { shopSurface } from '../constants/shopSurface';
import { trackBeginCheckout } from '../analytics';
import { computeShippingPaise, paiseUntilFreeShipping, type ShippingConfig } from '../utils/shipping';
import { CouponCodeField } from '../components/CouponCodeField';
import { CouponPromoBanner } from '../components/CouponPromoBanner';
import type { ValidatedCoupon } from '../types/coupon';
import {
  cartBlocksCoupons,
  cartItemsForCouponApi,
} from '../utils/couponEligibility';
import { clearStoredCouponCode } from '../utils/coupon';

const DEFAULT_SHIPPING: ShippingConfig = {
  chargePaise: 10_000,
  freeShippingMinPaise: null,
};

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window as Window & { Razorpay?: unknown };
    if (w.Razorpay) {
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const fieldSx = shopSurface.lightField;
const sectionLabelSx = { ...shopSurface.pdpTypography.label, color: shopSurface.inkMuted, mb: 1 };

export function CheckoutPage() {
  const { user } = useAuth();
  const { lines, totalPaise } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<ShippingAddressForm>(() => emptyShippingForm());
  const [savedRows, setSavedRows] = useState<SavedAddressRow[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING);
  const [appliedCoupon, setAppliedCoupon] = useState<ValidatedCoupon | null>(null);
  const [couponApplyRequest, setCouponApplyRequest] = useState<{ code: string; requestId: number } | null>(
    null,
  );
  const checkoutTracked = useRef(false);

  useEffect(() => {
    if (lines.length === 0 || checkoutTracked.current) return;
    checkoutTracked.current = true;
    trackBeginCheckout(lines);
  }, [lines]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ settings: { shipping: ShippingConfig } }>('/api/site-settings');
        if (!cancelled && res.settings?.shipping) {
          setShippingConfig(res.settings.shipping);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<{ addresses: SavedAddressRow[] }>('/api/me/addresses');
        if (cancelled) return;
        setSavedRows(res.addresses);
        const def = res.addresses.find((a) => a.isDefault);
        if (def) {
          setSelectedSavedId(def.id);
          setAddress({
            label: '',
            recipientName: def.recipientName ?? '',
            recipientMobile: def.recipientMobile ?? '',
            line1: def.line1,
            line2: def.line2 ?? '',
            city: def.city,
            state: def.state,
            postalCode: def.postalCode,
            country: def.country || 'IN',
          });
          if (def.recipientMobile?.trim()) setPhone(def.recipientMobile.trim());
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const valid =
    address.line1.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    address.postalCode.trim().length > 0;

  const payloadItems = useMemo(
    () =>
      lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitPricePaise: l.price,
        ...(l.bundleGroupId?.trim() ? { bundleGroupId: l.bundleGroupId.trim() } : {}),
        ...(l.selectedSize?.trim() ? { selectedSize: l.selectedSize.trim() } : {}),
      })),
    [lines],
  );
  const couponCartItems = useMemo(() => cartItemsForCouponApi(lines), [lines]);
  const couponsBlocked = useMemo(() => cartBlocksCoupons(lines), [lines]);

  useEffect(() => {
    if (!couponsBlocked || !appliedCoupon) return;
    setAppliedCoupon(null);
    setCouponApplyRequest(null);
    clearStoredCouponCode();
  }, [couponsBlocked, appliedCoupon]);

  const shippingPaise = useMemo(
    () => computeShippingPaise(totalPaise, shippingConfig),
    [totalPaise, shippingConfig],
  );
  const discountPaise = appliedCoupon?.discountPaise ?? 0;
  const discountedSubtotalPaise = Math.max(0, totalPaise - discountPaise);
  const orderTotalPaise = discountedSubtotalPaise + shippingPaise;
  const freeShippingGapPaise = useMemo(
    () => paiseUntilFreeShipping(totalPaise, shippingConfig),
    [totalPaise, shippingConfig],
  );

  const addressForOrder = useMemo(() => {
    const fromSaved = selectedSavedId ? savedRows.find((r) => r.id === selectedSavedId) : undefined;
    const label = fromSaved?.label?.trim();
    const name = address.recipientName.trim() || undefined;
    const mobileRaw = address.recipientMobile.trim() || phone.trim();
    const mobileDigits = mobileRaw.replace(/\D/g, '');
    const recipientMobile =
      mobileDigits.length >= 10 ? mobileRaw.replace(/\s/g, '') || mobileDigits : undefined;

    return {
      line1: address.line1.trim(),
      line2: address.line2.trim() || undefined,
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country.trim() || 'IN',
      ...(label ? { label } : {}),
      ...(name ? { recipientName: name } : {}),
      ...(recipientMobile ? { recipientMobile } : {}),
    };
  }, [address, selectedSavedId, savedRows, phone]);

  async function pay() {
    setError(null);
    if (!valid || lines.length === 0) {
      setError('Fill address and ensure cart has items');
      return;
    }
    setBusy(true);
    try {
      const orderRes = await apiFetch<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: payloadItems,
          address: addressForOrder,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error('Could not load Razorpay script');
      }

      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open: () => void } })
        .Razorpay;

      const contactDigits = phone.replace(/\D/g, '');
      const prefillContact =
        contactDigits.length >= 10 ? `+91${contactDigits.slice(-10)}` : undefined;
      const options: Record<string, unknown> = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        order_id: orderRes.razorpayOrderId,
        name: 'Paduchu Shop',
        description: 'Order payment',
        method: {
          card: true,
          upi: true,
          netbanking: true,
          wallet: true,
          emi: true,
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          ...(prefillContact ? { contact: prefillContact } : {}),
        },
        notes: {
          orderRef: orderRes.orderId.slice(-8),
        },
        theme: { color: '#050B18' },
        handler: (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setBusy(false);
          navigate('/checkout/complete', {
            replace: true,
            state: {
              orderId: orderRes.orderId,
              amount: orderRes.amount,
              totalPaise,
              lines: [...lines],
              razorpay: response,
            },
          });
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      };

      const rz = new RazorpayCtor(options);
      rz.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setBusy(false);
    }
  }

  if (lines.length === 0) {
    return (
      <StorefrontPageShell maxWidth={520}>
        <Typography component="h1" sx={{ ...shopSurface.pageTitle, mb: 2 }}>
          Checkout
        </Typography>
        <Typography sx={{ color: shopSurface.inkMuted, mb: 3 }}>Nothing to checkout.</Typography>
        <Button variant="contained" onClick={() => navigate('/cart')} sx={shopSurface.cta}>
          Go to cart
        </Button>
      </StorefrontPageShell>
    );
  }

  return (
    <StorefrontPageShell maxWidth={520}>
      <Stack spacing={2.5} component="form" onSubmit={(e) => e.preventDefault()}>
        <Typography component="h1" sx={shopSurface.pageTitle}>
          Checkout
        </Typography>

        <Paper elevation={0} sx={shopSurface.insetPanel}>
          {!appliedCoupon && !couponsBlocked && (
            <CouponPromoBanner
              subtotalPaise={totalPaise}
              cartLines={lines}
              onApplyCode={(code) => setCouponApplyRequest({ code, requestId: Date.now() })}
              compact
            />
          )}
          {!couponsBlocked ? (
            <Box sx={{ mt: appliedCoupon ? 0 : 2 }}>
              <CouponCodeField
                subtotalPaise={totalPaise}
                applied={appliedCoupon}
                onAppliedChange={(coupon) => {
                  setAppliedCoupon(coupon);
                  if (!coupon) setCouponApplyRequest(null);
                }}
                applyRequest={couponApplyRequest}
                cartItems={couponCartItems}
              />
            </Box>
          ) : null}
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted }}>
                Subtotal
              </Typography>
              <Typography sx={{ ...shopSurface.amount, color: shopSurface.ink }}>
                {formatInrFromPaise(totalPaise)}
              </Typography>
            </Stack>
            {discountPaise > 0 && (
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontFamily: shopSurface.font.body, color: '#0f7a75' }}>
                  Coupon ({appliedCoupon?.code})
                </Typography>
                <Typography sx={{ ...shopSurface.amount, color: '#0f7a75' }}>
                  −{formatInrFromPaise(discountPaise)}
                </Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted }}>
                Shipping
              </Typography>
              <Typography sx={{ ...shopSurface.amount, color: shopSurface.ink }}>
                {shippingPaise === 0 ? 'Free' : formatInrFromPaise(shippingPaise)}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ pt: 1, borderTop: '1px solid rgba(5, 11, 24, 0.08)' }}
            >
              <Typography sx={{ ...shopSurface.amountLg, fontSize: '1.1rem', color: shopSurface.ink }}>
                Total
              </Typography>
              <Typography sx={{ ...shopSurface.amountLg, fontSize: '1.35rem', color: shopSurface.ink }}>
                {formatInrFromPaise(orderTotalPaise)}
              </Typography>
            </Stack>
          </Stack>
          <Typography
            variant="body2"
            sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted, mt: 1.25 }}
          >
            {lines.length} {lines.length === 1 ? 'item' : 'items'} in your bag
            {freeShippingGapPaise != null
              ? ` · Add ${formatInrFromPaise(freeShippingGapPaise)} more for free shipping`
              : shippingConfig.freeShippingMinPaise != null && shippingPaise === 0
                ? ' · Free shipping applied'
                : ''}
          </Typography>
        </Paper>

        <Box>
          <Typography sx={sectionLabelSx}>
            Payment methods
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label="UPI" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Cards" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="EMI" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Wallets" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Net banking" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
          </Stack>
          <Typography
            variant="body2"
            sx={{ fontFamily: shopSurface.font.body, color: shopSurface.inkMuted, mt: 1 }}
          >
            You will complete payment securely in Razorpay.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ ...shopSurface.card, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Mobile (for UPI / SMS)"
            fullWidth
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputProps={{ inputMode: 'numeric', maxLength: 15 }}
            helperText="Optional; pre-fills Razorpay for faster UPI and card flows"
            sx={fieldSx}
          />

          {savedRows.length > 0 && (
            <TextField
              select
              label="Ship to"
              fullWidth
              value={selectedSavedId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedSavedId(v);
                if (!v) {
                  setAddress(emptyShippingForm());
                  return;
                }
                const row = savedRows.find((r) => r.id === v);
                if (row) {
                  setAddress({
                    label: '',
                    recipientName: row.recipientName ?? '',
                    recipientMobile: row.recipientMobile ?? '',
                    line1: row.line1,
                    line2: row.line2 ?? '',
                    city: row.city,
                    state: row.state,
                    postalCode: row.postalCode,
                    country: row.country || 'IN',
                  });
                  if (row.recipientMobile?.trim()) {
                    setPhone(row.recipientMobile.trim());
                  }
                }
              }}
              sx={fieldSx}
            >
              <MenuItem value="">
                <em>Enter a new address</em>
              </MenuItem>
              {savedRows.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.label}
                  {r.recipientName ? ` — ${r.recipientName}` : ''}
                  {r.isDefault ? ' (default)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}

          <ShippingAddressFields
            value={address}
            showLabel={false}
            fieldSx={fieldSx}
            onChange={(next) => {
              setAddress(next);
              setSelectedSavedId('');
            }}
          />
        </Paper>

        <Button variant="contained" size="large" disabled={!valid || busy} onClick={() => void pay()} sx={shopSurface.cta}>
          {busy ? 'Processing payment…' : 'Pay securely'}
        </Button>
      </Stack>
    </StorefrontPageShell>
  );
}
