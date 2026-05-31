import type { HydratedDocument } from 'mongoose';
import { ProductModel } from '../models/Product.js';
import type { OrderDoc } from '../models/Order.js';
import { invalidateCatalogForProductIds } from '../cache/catalog.js';
import { notifyOrderPaidEmails } from './orderPaidEmails.js';

export async function completePaidOrder(
  order: HydratedDocument<OrderDoc>,
  paymentId: string,
): Promise<void> {
  order.status = 'paid';
  order.razorpayPaymentId = paymentId;
  await order.save();

  for (const item of order.items) {
    await ProductModel.updateOne({ _id: item.productId }, { $inc: { stock: -item.qty } });
  }

  const productIds = [...new Set(order.items.map((i) => String(i.productId)))];
  await invalidateCatalogForProductIds(productIds);
  const prods = await ProductModel.find({ _id: { $in: productIds } }).select('images').lean();
  const imageMap = new Map<string, string | null>();
  for (const p of prods) {
    const first = p.images?.[0];
    imageMap.set(String(p._id), typeof first === 'string' && first.length > 0 ? first : null);
  }

  const placedAtIso = order.updatedAt?.toISOString?.() ?? new Date().toISOString();

  const payload = {
    orderId: order._id.toString(),
    userId: order.user.toString(),
    amountPaise: order.amount,
    currency: order.currency ?? 'INR',
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      imageRaw: imageMap.get(String(i.productId)) ?? null,
    })),
    address: {
      line1: order.address.line1,
      line2: order.address.line2 ?? undefined,
      city: order.address.city,
      state: order.address.state,
      postalCode: order.address.postalCode,
      country: order.address.country,
      ...(order.address.label?.trim() ? { label: order.address.label.trim() } : {}),
      ...(order.address.recipientName?.trim() ? { recipientName: order.address.recipientName.trim() } : {}),
      ...(order.address.recipientMobile?.trim()
        ? { recipientMobile: order.address.recipientMobile.trim() }
        : {}),
    },
    razorpayPaymentId: paymentId,
    placedAtIso,
  };

  void notifyOrderPaidEmails(payload).catch((err) => console.error('[notifyOrderPaidEmails]', err));
}
