import { Router } from 'express';
import { z } from 'zod';
import { OrderModel } from '../models/Order.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const statusSchema = z.enum(['pending', 'paid', 'processing', 'shipped', 'cancelled']);

router.get('/', async (_req, res) => {
  const orders = await OrderModel.find().sort({ createdAt: -1 }).limit(200).populate('user', 'email name').lean();
  res.json({
    orders: orders.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      items: o.items,
      address: o.address,
      razorpayOrderId: o.razorpayOrderId,
      razorpayPaymentId: o.razorpayPaymentId,
      createdAt: o.createdAt,
      user: o.user,
    })),
  });
});

router.patch('/:id/status', async (req, res) => {
  let body: { status: z.infer<typeof statusSchema> };
  try {
    body = z.object({ status: statusSchema }).parse(req.body);
  } catch {
    res.status(400).json({ error: 'Invalid body' });
    return;
  }
  const order = await OrderModel.findByIdAndUpdate(
    req.params.id,
    { status: body.status },
    { new: true },
  ).lean();
  if (!order) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    order: {
      id: order._id.toString(),
      status: order.status,
    },
  });
});

export default router;
