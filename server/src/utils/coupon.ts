import type { CouponDiscountType, CouponDoc } from '../models/Coupon.js';

export class CouponServiceError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type CouponDiscountInput = {
  discountType: CouponDiscountType;
  percentOff?: number;
  fixedOffPaise?: number;
  maxDiscountPaise?: number | null;
};

/** Whole rupees as shown in the storefront (0 decimal places). */
function displayRupees(paise: number): number {
  return Math.round(paise / 100);
}

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function couponSlugFromCode(code: string): string {
  return normalizeCouponCode(code).toLowerCase();
}

export function computeDiscountPaise(subtotalPaise: number, coupon: CouponDiscountInput): number {
  if (subtotalPaise <= 0) return 0;

  let discount = 0;
  if (coupon.discountType === 'percent') {
    const pct = coupon.percentOff ?? 0;
    if (pct <= 0) return 0;
    discount = Math.floor((subtotalPaise * pct) / 100);
    if (coupon.maxDiscountPaise != null && coupon.maxDiscountPaise > 0) {
      discount = Math.min(discount, coupon.maxDiscountPaise);
    }
  } else {
    discount = coupon.fixedOffPaise ?? 0;
  }

  return Math.min(Math.max(0, discount), subtotalPaise);
}

export function qualifiesForCoupon(subtotalPaise: number, minSubtotalPaise: number): boolean {
  if (minSubtotalPaise <= 0) return subtotalPaise > 0;
  return displayRupees(subtotalPaise) >= displayRupees(minSubtotalPaise);
}

export function paiseUntilCouponEligible(subtotalPaise: number, minSubtotalPaise: number): number | null {
  if (minSubtotalPaise <= 0 || qualifiesForCoupon(subtotalPaise, minSubtotalPaise)) return null;
  const gapRupees = displayRupees(minSubtotalPaise) - displayRupees(subtotalPaise);
  return Math.max(0, gapRupees) * 100;
}

export function formatDiscountLabel(coupon: Pick<CouponDoc, 'discountType' | 'percentOff' | 'fixedOffPaise'>): string {
  if (coupon.discountType === 'percent') {
    const pct = coupon.percentOff ?? 0;
    return `${pct}% off`;
  }
  const rupees = Math.round((coupon.fixedOffPaise ?? 0) / 100);
  return `₹${rupees.toLocaleString('en-IN')} off`;
}

export function couponIsExpired(coupon: Pick<CouponDoc, 'expiresAt'>): boolean {
  if (!coupon.expiresAt) return false;
  const ms = Date.parse(coupon.expiresAt);
  return Number.isFinite(ms) && ms < Date.now();
}

export function resolvePerUserLimit(
  coupon: Pick<CouponDoc, 'perUserLimit' | 'usageLimit'>,
): number | null {
  const limit = coupon.perUserLimit ?? coupon.usageLimit;
  if (limit == null || limit <= 0) return null;
  return limit;
}

export function userCouponUsageExhausted(perUserLimit: number | null, userUsageCount: number): boolean {
  if (perUserLimit == null) return false;
  return userUsageCount >= perUserLimit;
}

export function serializePublicPromotion(coupon: CouponDoc, eligibleSubtotalPaise?: number) {
  const categorySlugs = (coupon.categorySlugs ?? []).map((s) => s.trim()).filter(Boolean);
  return {
    id: coupon._id,
    code: coupon.code,
    label: coupon.label?.trim() || coupon.code,
    discountType: coupon.discountType,
    percentOff: coupon.percentOff ?? null,
    fixedOffPaise: coupon.fixedOffPaise ?? null,
    minSubtotalPaise: coupon.minSubtotalPaise,
    maxDiscountPaise: coupon.maxDiscountPaise ?? null,
    discountLabel: formatDiscountLabel(coupon),
    categorySlugs,
    ...(eligibleSubtotalPaise !== undefined ? { eligibleSubtotalPaise } : {}),
  };
}
