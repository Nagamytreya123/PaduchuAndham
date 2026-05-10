import { Types } from 'mongoose';
import { OrderModel } from '../models/Order.js';
import { REVIEW_ELIGIBLE_ORDER_STATUSES } from '../models/Review.js';

/**
 * Returns an order id if the user has this product on an order marked **delivered**
 * (earliest such order, for stable audit linkage on Review.order).
 */
export async function findPurchasedOrderForProduct(
  userId: string,
  productId: string,
): Promise<Types.ObjectId | null> {
  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) return null;
  const pid = new Types.ObjectId(productId);
  const order = await OrderModel.findOne({
    user: new Types.ObjectId(userId),
    status: { $in: [...REVIEW_ELIGIBLE_ORDER_STATUSES] },
    'items.productId': pid,
  })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();
  return order?._id ?? null;
}
