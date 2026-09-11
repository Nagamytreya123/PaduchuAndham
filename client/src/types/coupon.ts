export type CouponDiscountType = 'percent' | 'fixed';

export type CouponPromotion = {
  id: string;
  code: string;
  label: string;
  discountType: CouponDiscountType;
  percentOff: number | null;
  fixedOffPaise: number | null;
  minSubtotalPaise: number;
  maxDiscountPaise: number | null;
  discountLabel: string;
  categorySlugs: string[];
  /** Subtotal in paise for coupon-eligible cart lines (category-restricted promos). */
  eligibleSubtotalPaise?: number;
};

export type AdminCoupon = CouponPromotion & {
  isActive: boolean;
  perUserLimit: number | null;
  expiresAt: string | null;
  categorySlugs: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ValidatedCoupon = {
  couponId: string;
  code: string;
  label: string;
  discountType: CouponDiscountType;
  discountPaise: number;
  discountLabel: string;
  minSubtotalPaise: number;
  subtotalPaise: number;
};
