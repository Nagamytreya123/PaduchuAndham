import { useEffect, useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
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

const fieldSx = {
  '& .MuiInputLabel-root': { color: shopSurface.inkMuted },
  '& .MuiOutlinedInput-root': {
    color: shopSurface.ink,
    bgcolor: 'rgba(255,255,255,0.85)',
    '& fieldset': { borderColor: 'rgba(5, 11, 24, 0.15)' },
    '&:hover fieldset': { borderColor: 'rgba(5, 11, 24, 0.28)' },
    '&.Mui-focused fieldset': { borderColor: shopSurface.ink },
  },
  '& .MuiFormHelperText-root': { color: shopSurface.inkMuted },
};

export function CheckoutPage() {
  const { user } = useAuth();
  const { lines, totalPaise, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState<ShippingAddressForm>(() => emptyShippingForm());
  const [savedRows, setSavedRows] = useState<SavedAddressRow[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');

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
    () => lines.map((l) => ({ productId: l.productId, qty: l.qty, unitPricePaise: l.price })),
    [lines],
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
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await apiFetch('/api/orders/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                orderId: orderRes.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            clear();
            navigate('/account', { replace: true });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed');
          } finally {
            setBusy(false);
          }
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
          <Typography sx={{ fontFamily: shopSurface.font.display, fontSize: '1.15rem', fontWeight: 600 }}>
            {formatInrFromPaise(totalPaise)}
          </Typography>
          <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 0.5 }}>
            Order total · {lines.length} line(s) in your bag
          </Typography>
        </Paper>

        <Box>
          <Typography
            sx={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: shopSurface.inkMuted,
              mb: 1,
            }}
          >
            Payment methods
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label="UPI" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Cards" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="EMI" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Wallets" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
            <Chip size="small" variant="outlined" label="Net banking" sx={{ borderColor: 'rgba(5,11,24,0.2)', color: shopSurface.ink }} />
          </Stack>
          <Typography variant="body2" sx={{ color: shopSurface.inkMuted, mt: 1 }}>
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
            onChange={(next) => {
              setAddress(next);
              setSelectedSavedId('');
            }}
          />
        </Paper>

        <Button variant="contained" size="large" disabled={!valid || busy} onClick={() => void pay()} sx={shopSurface.cta}>
          {busy ? <CircularProgress size={24} color="inherit" /> : 'Pay securely'}
        </Button>
      </Stack>
    </StorefrontPageShell>
  );
}
