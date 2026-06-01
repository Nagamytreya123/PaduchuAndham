import type { CartLine } from '../context/CartContext';

export type RazorpayPaymentPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type OrderCompletionNavState = {
  orderId: string;
  amount: number;
  totalPaise: number;
  lines: CartLine[];
  razorpay: RazorpayPaymentPayload;
};
