import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useCart } from '../context/CartContext';
import { trackPurchase } from '../analytics';
import { OrderCompletionExperience, type OrderCompletionOutcome } from '../components/order/OrderCompletionExperience';
import { formatEstimatedDelivery } from '../utils/estimatedDelivery';
import type { OrderCompletionNavState } from '../types/orderCompletion';
import { useReducedMotion } from '../hooks/useReducedMotion';

function delay(ms: number) {
  return new Promise<void>((r) => {
    window.setTimeout(r, ms);
  });
}

export function OrderCompletionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clear } = useCart();
  const reduced = useReducedMotion();
  const state = location.state as OrderCompletionNavState | null;

  const [outcome, setOutcome] = useState<OrderCompletionOutcome>('processing');
  const [failureMessage, setFailureMessage] = useState<string | undefined>();
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (!state || verifyStarted.current) return;
    verifyStarted.current = true;

    const minProcessingMs = reduced ? 0 : 1500;

    (async () => {
      const started = Date.now();
      try {
        await apiFetch('/api/orders/verify-payment', {
          method: 'POST',
          body: JSON.stringify({
            orderId: state.orderId,
            razorpay_order_id: state.razorpay.razorpay_order_id,
            razorpay_payment_id: state.razorpay.razorpay_payment_id,
            razorpay_signature: state.razorpay.razorpay_signature,
          }),
        });
        const elapsed = Date.now() - started;
        await delay(Math.max(0, minProcessingMs - elapsed));
        trackPurchase(state.orderId, state.lines, state.totalPaise);
        clear();
        setOutcome('success');
      } catch (e) {
        const elapsed = Date.now() - started;
        await delay(Math.max(0, Math.min(minProcessingMs, 800) - elapsed));
        setFailureMessage(e instanceof Error ? e.message : 'Payment verification failed');
        setOutcome('failure');
      }
    })();
  }, [state, clear, reduced]);

  if (!state?.orderId || !state.razorpay) {
    return <Navigate to="/account/orders" replace />;
  }

  const estimatedDelivery = formatEstimatedDelivery();

  return (
    <OrderCompletionExperience
      outcome={outcome}
      orderNumber={state.orderId}
      amountPaise={state.amount}
      estimatedDelivery={estimatedDelivery}
      failureMessage={failureMessage}
      onTrackOrder={() => navigate('/account/orders', { replace: true })}
      onContinueShopping={() => navigate('/shop', { replace: true })}
      onTryAgain={() => navigate('/checkout', { replace: true })}
      onContactSupport={() => {
        window.location.href = 'mailto:support@paduchuandham.com?subject=Order%20payment%20issue';
      }}
    />
  );
}
