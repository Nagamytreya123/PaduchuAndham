import crypto from 'crypto';
import express from 'express';
import { OrderModel } from '../models/Order.js';
import { env } from '../config/env.js';
import { completePaidOrder } from '../services/completePaidOrder.js';

const router = express.Router();

router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  const body = req.body as Buffer;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }
  } catch {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  let parsed: {
    event?: string;
    payload?: {
      payment?: { entity?: { order_id?: string; id?: string } };
    };
  };
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const paymentEntity = parsed.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id;
  const paymentId = paymentEntity?.id;

  const ev = parsed.event;
  if (ev && ev !== 'payment.captured') {
    res.json({ received: true });
    return;
  }

  if (!orderId || !paymentId) {
    res.json({ received: true });
    return;
  }

  const order = await OrderModel.findOne({ razorpayOrderId: orderId });
  if (!order) {
    res.json({ received: true });
    return;
  }
  if (order.status === 'paid') {
    res.json({ received: true });
    return;
  }

  await completePaidOrder(order, paymentId);

  res.json({ received: true });
});

export default router;
