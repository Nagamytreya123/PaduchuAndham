import crypto from 'crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { Types } from 'mongoose';
import { OrderModel } from '../models/Order.js';
import { ProductModel } from '../models/Product.js';
import { ReviewModel } from '../models/Review.js';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { completePaidOrder } from '../services/completePaidOrder.js';
import { validateOrderItemsWithBundles, type JewelleryComboDefinition } from '../utils/watchBraceletBundle.js';

const router = Router();

/** Map product ids → first catalogue image for order line display */
async function buildProductImageMap(productIds: string[]): Promise<Map<string, string | null>> {
  if (productIds.length === 0) return new Map();
  const unique = [...new Set(productIds)];
  const products = await ProductModel.find({ _id: { $in: unique } })
    .select('images')
    .lean();
  return new Map(
    products.map((p) => {
      const first = p.images?.[0];
      return [String(p._id), typeof first === 'string' && first.length > 0 ? first : null];
    }),
  );
}

type OrderItemLean = { productId: unknown; name: string; price: number; qty: number };
type OrderLean = { status: string; items: OrderItemLean[] };

/** Per-product review state for line items on delivered orders */
async function reviewFlagsForDeliveredOrders(
  userId: Types.ObjectId,
  orders: OrderLean[],
): Promise<Map<string, { canSubmit: boolean; alreadyReviewed: boolean; myRating?: number }>> {
  const productIds = new Set<string>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    for (const it of o.items) {
      productIds.add(String(it.productId));
    }
  }
  if (productIds.size === 0) return new Map();

  const oidList = [...productIds]
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  if (oidList.length === 0) return new Map();

  const existing = await ReviewModel.find({
    user: userId,
    product: { $in: oidList },
  })
    .select('product rating')
    .lean();

  const ratingByProduct = new Map<string, number>(
    existing.map((r) => [String(r.product), r.rating]),
  );

  const out = new Map<string, { canSubmit: boolean; alreadyReviewed: boolean; myRating?: number }>();
  for (const pid of productIds) {
    const r = ratingByProduct.get(pid);
    if (r != null) {
      out.set(pid, { canSubmit: false, alreadyReviewed: true, myRating: r });
    } else {
      out.set(pid, { canSubmit: true, alreadyReviewed: false });
    }
  }
  return out;
}

function serializeOrderItems(
  o: OrderLean,
  imageMap: Map<string, string | null>,
  reviewMap: Map<string, { canSubmit: boolean; alreadyReviewed: boolean; myRating?: number }>,
) {
  return o.items.map((item) => {
    const pid = String(item.productId);
    const row: Record<string, unknown> = {
      productId: pid,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: imageMap.get(pid) ?? null,
    };
    if (o.status === 'delivered') {
      const rev = reviewMap.get(pid);
      if (rev) row.review = rev;
    }
    return row;
  });
}

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
      /** Per-unit price in paise (must match catalogue or a valid watch+bracelet bundle). */
      unitPricePaise: z.number().int().min(0).optional(),
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
    res.status(503).json({
      error:
        'Payments are not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env (see .env.example). Restart the API after saving.',
      code: 'PAYMENTS_NOT_CONFIGURED',
    });
    return;
  }

  const uniqueIds = [...new Set(body.items.map((i) => i.productId))];
  const products = await ProductModel.find({ _id: { $in: uniqueIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  for (const line of body.items) {
    const product = productMap.get(line.productId);
    if (!product) {
      res.status(400).json({
        error:
          'This product is not in the catalogue (wrong id, removed item, or cart from another database). Clear the cart and add the product again from the shop.',
        code: 'PRODUCT_NOT_FOUND',
        productId: line.productId,
      });
      return;
    }
    if (!product.isActive) {
      res.status(400).json({
        error: `This product is no longer for sale: ${product.name}`,
        code: 'PRODUCT_INACTIVE',
        productId: line.productId,
      });
      return;
    }
  }

  const qtyByProduct = new Map<string, number>();
  for (const line of body.items) {
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + line.qty);
  }
  for (const [pid, qty] of qtyByProduct) {
    const product = productMap.get(pid)!;
    if (product.stock < qty) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      return;
    }
  }

  let lineItems: {
    productId: Types.ObjectId;
    name: string;
    price: number;
    qty: number;
  }[];
  let amountPaise: number;

  const comboDocs = await JewelleryComboModel.find({ isActive: true }).select('productIds price').lean();
  const jewelleryComboDefs: JewelleryComboDefinition[] = [];
  for (const c of comboDocs) {
    const ids = (c.productIds ?? []).map((id) => String(id));
    if (ids.length < 2 || c.price == null || c.price <= 0) continue;
    jewelleryComboDefs.push({ productIds: ids, bundlePricePaise: c.price });
  }

  try {
    const bundleMap = new Map(
      products.map((p) => [
        String(p._id),
        {
          _id: p._id,
          name: p.name,
          price: p.price,
          matchingBraceletIds: p.matchingBraceletIds,
          watchBraceletBundlePrice: p.watchBraceletBundlePrice,
        },
      ]),
    );
    const validated = validateOrderItemsWithBundles(body.items, bundleMap, jewelleryComboDefs);
    amountPaise = validated.amountPaise;
    lineItems = validated.lines;
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid cart pricing' });
    return;
  }
  if (amountPaise < 100) {
    res.status(400).json({ error: 'Order total must be at least ₹1 (100 paise)' });
    return;
  }

  const order = await OrderModel.create({
    user: req.user!.id,
    items: lineItems,
    amount: amountPaise,
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
  let razorpayOrder: { id: string };
  try {
    razorpayOrder = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        orderId: order._id.toString(),
      },
    });
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'error' in e && e.error && typeof e.error === 'object' && 'description' in e.error
        ? String((e.error as { description?: string }).description)
        : null;
    res.status(502).json({
      error: msg ?? 'Could not create Razorpay order. Check API keys and your Razorpay account.',
      code: 'RAZORPAY_ORDER_FAILED',
    });
    return;
  }

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  res.status(201).json({
    orderId: order._id.toString(),
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
  });
});

router.get('/mine', async (req, res) => {
  const orders = await OrderModel.find({ user: req.user!.id }).sort({ createdAt: -1 }).lean();
  const allProductIds: string[] = [];
  for (const o of orders) {
    for (const it of o.items) {
      allProductIds.push(String(it.productId));
    }
  }
  const imageMap = await buildProductImageMap(allProductIds);
  const userOid = new Types.ObjectId(req.user!.id);
  const reviewMap = await reviewFlagsForDeliveredOrders(
    userOid,
    orders.map((o) => ({ status: o.status, items: o.items })),
  );

  res.json({
    orders: orders.map((o) => ({
      id: o._id.toString(),
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      createdAt: o.createdAt,
      items: serializeOrderItems({ status: o.status, items: o.items }, imageMap, reviewMap),
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
  const imageMap = await buildProductImageMap(o.items.map((it) => String(it.productId)));
  const userOid = new Types.ObjectId(req.user!.id);
  const reviewMap = await reviewFlagsForDeliveredOrders(userOid, [{ status: o.status, items: o.items }]);
  res.json({
    order: {
      id: o._id.toString(),
      status: o.status,
      amount: o.amount,
      currency: o.currency,
      items: serializeOrderItems({ status: o.status, items: o.items }, imageMap, reviewMap),
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
    res.status(503).json({
      error: 'Payments are not configured: set RAZORPAY_KEY_SECRET in .env.',
      code: 'PAYMENTS_NOT_CONFIGURED',
    });
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

  await completePaidOrder(order, body.razorpay_payment_id);

  res.json({ ok: true, orderId: order._id.toString(), status: order.status });
});

export default router;
