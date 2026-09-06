import { OrderModel } from '../models/Order.js';
import { REVIEW_ELIGIBLE_ORDER_STATUSES } from '../models/Review.js';
import { isValidEntityId } from './entityId.js';

/**
 * Returns an order id if the user has this product on an order marked **delivered**
 * (earliest such order, for stable audit linkage on Review.order).
 */
export async function findPurchasedOrderForProduct(
  userId: string,
  productId: string,
): Promise<string | null> {
  if (!isValidEntityId(userId) || !isValidEntityId(productId)) return null;
  const order = await OrderModel.findOne({
    user: userId,
    status: { $in: [...REVIEW_ELIGIBLE_ORDER_STATUSES] },
    'items.productId': productId,
  })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();
  return order?._id ? String(order._id) : null;
}
