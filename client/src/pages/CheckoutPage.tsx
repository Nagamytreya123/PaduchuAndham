import { useMemo, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatInrFromPaise } from '../utils/format';

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

export function CheckoutPage() {
  const { user } = useAuth();
  const { lines, totalPaise, clear } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  });

  const valid =
    address.line1.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    address.postalCode.trim().length > 0;

  const payloadItems = useMemo(
    () => lines.map((l) => ({ productId: l.productId, qty: l.qty })),
    [lines],
  );

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
          address,
        }),
      });

      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error('Could not load Razorpay script');
      }

      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: Record<string, unknown>) => { open: () => void } })
        .Razorpay;

      const options: Record<string, unknown> = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        order_id: orderRes.razorpayOrderId,
        name: 'Paduchu Shop',
        description: 'Order payment',
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#1565c0' },
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
            navigate('/account/orders', { replace: true });
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
      <Stack spacing={2}>
        <Typography variant="h6">Nothing to checkout</Typography>
        <Button variant="contained" onClick={() => navigate('/cart')}>
          Go to cart
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} component="form" onSubmit={(e) => e.preventDefault()} maxWidth={520} mx="auto">
      <Typography variant="h5" fontWeight={700}>
        Checkout
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Total {formatInrFromPaise(totalPaise)}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TextField
        label="Address line 1"
        required
        fullWidth
        value={address.line1}
        onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
      />
      <TextField
        label="Address line 2"
        fullWidth
        value={address.line2}
        onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="City"
          required
          fullWidth
          value={address.city}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
        />
        <TextField
          label="State"
          required
          fullWidth
          value={address.state}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="PIN / Postal code"
          required
          fullWidth
          value={address.postalCode}
          onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
        />
        <TextField
          label="Country"
          fullWidth
          value={address.country}
          onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
        />
      </Stack>

      <Button variant="contained" size="large" disabled={!valid || busy} onClick={() => void pay()}>
        {busy ? <CircularProgress size={24} color="inherit" /> : 'Pay with Razorpay'}
      </Button>
    </Stack>
  );
}
