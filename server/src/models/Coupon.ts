import { createDynamoModel } from '../db/dynamo/client.js';

export type CouponDiscountType = 'percent' | 'fixed';

export type CouponDoc = {
  _id: string;
  /** Lowercase code for GSI slug lookup */
  slug: string;
  /** Display code (uppercase) */
  code: string;
  label?: string;
  discountType: CouponDiscountType;
  percentOff?: number;
  fixedOffPaise?: number;
  minSubtotalPaise: number;
  maxDiscountPaise?: number | null;
  isActive?: boolean;
  /** Max redemptions per customer account. */
  perUserLimit?: number | null;
  /** @deprecated Legacy global limit — treated as perUserLimit when perUserLimit is unset. */
  usageLimit?: number | null;
  /** @deprecated No longer incremented; kept for legacy rows only. */
  usageCount?: number;
  expiresAt?: string | null;
  /** Empty or omitted = applies to all categories. */
  categorySlugs?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const CouponModel = createDynamoModel('Coupon') as any;
