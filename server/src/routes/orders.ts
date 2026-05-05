import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { Types } from 'mongoose';
import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

const addressSchema = z.object({
  line1: z.string().min(1).max(300),
  line2: z.string().max(300).optional(),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(1).max(20),
  country: z.string().max(4).optional(),
});

const createBodySchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      qty: z.number().int().min(1),
    }),
  ).min(1),
  address: addressSchema,
});

router.use(requireAuth);

router.post('/', checkoutLimiter, async (req, res) => {
  let body: z.infer<typeof createBodySchema>;
  try {
    body = createBodySchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: 'Payments are not configured' });
    return;
  }

  const lineItems: {
    productId: Types.ObjectId;
    name: string;
    price: number;
    qty: number;
  }[] = [];

  let amount = 0;
  for (const line of body.items) {
    const product = await ProductModel.findById(line.productId).lean();
    if (!product || !product.isActive) {
      res.status(400).json({ error: `Invalid product: ${line.productId}` });
      return;
    }
    if (product.stock < line.qty) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      return;
    }
    const lineTotal = product.price * line.qty;
    amount += lineTotal;
    lineItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      qty: line.qty,
    });
  }

  const order = await OrderModel.create({
    user: req.user!.id,
    items: lineItems,
    amount,
    currency: 'INR',
    status: 'pending',
    address: {
      ...body.address,
      country: body.address.country ?? 'IN',
    },
  });

  const rzp = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });

  const receipt = order._id.toString().slice(-20);
  const razorpayOrder = await rzp.orders.create({
    amount,
    currency: 'INR',
    receipt,
    notes: {
      orderId: order._id.toString(),
    },
  });

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(201).json({
    orderId: order._id.toString(),
    razorpayOrderId: razorpayOrder.id,
    amount,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
  });
});

router.get('/mine', async (req, res) => {
  const orders = await OrderModel.find({ user: req.user!.id }).sort({ createdAt: -1 }).lean();
  res.json({
    orders: orders.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      createdAt: o.createdAt,
      items: o.items,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
    })),
  });
});

router.get('/mine/:id', async (req, res) => {
  const o = await OrderModel.findOne({ _id: req.params.id, user: req.user!.id }).lean();
  if (!o) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    order: {
      id: o._id.toString(),
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      items: o.items,
      address: o.address,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      createdAt: o.createdAt,
    },
  });
});

const verifyBodySchema = z.object({
  orderId: z.string(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

router.post('/verify-payment', checkoutLimiter, async (req, res) => {
  let body: z.infer<typeof verifyBodySchema>;
  try {
    body = verifyBodySchema.parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  if (!env.RAZORPAY_KEY_SECRET) {
    res.status(503).json({ error: 'Payments are not configured' });
    return;
  }

  const order = await OrderModel.findOne({
    _id: body.orderId,
    user: req.user!.id,
    razorpayOrderId: body.razorpay_order_id,
  });
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  if (order.status === 'paid') {
    res.json({ ok: true, orderId: order._id.toString(), status: order.status });
    return;
  }

  const generated = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
    .digest('hex');

  if (generated !== body.razorpay_signature) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  order.status = 'paid';
  order.razorpayPaymentId = body.razorpay_payment_id;
  await order.save();

  for (const item of order.items) {
    await ProductModel.updateOne({ _id: item.productId }, { $inc: { stock: -item.qty } });
  }

  res.json({ ok: true, orderId: order._id.toString(), status: order.status });
});

export default router;
