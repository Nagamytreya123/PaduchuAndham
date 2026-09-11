import type { CouponDiscountType, CouponPromotion } from '../types/coupon';
import { formatInrFromPaise } from './format';

export type CouponDiscountInput = {
  discountType: CouponDiscountType;
  percentOff?: number | null;
  fixedOffPaise?: number | null;
  maxDiscountPaise?: number | null;
};

function displayRupees(paise: number): number {
  return Math.round(paise / 100);
}

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
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

export function promotionTeaser(promotion: CouponPromotion, subtotalPaise: number): string {
  const gap = paiseUntilCouponEligible(subtotalPaise, promotion.minSubtotalPaise);
  if (gap != null) {
    return `Shop more ${formatInrFromPaise(gap)} to unlock ${promotion.discountLabel}`;
  }
  return `You're eligible for ${promotion.discountLabel} — use code ${promotion.code}`;
}

export const COUPON_STORAGE_KEY = 'paduchu.appliedCouponCode';

export function readStoredCouponCode(): string {
  try {
    return sessionStorage.getItem(COUPON_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeStoredCouponCode(code: string): void {
  try {
    const normalized = normalizeCouponCode(code);
    if (normalized) sessionStorage.setItem(COUPON_STORAGE_KEY, normalized);
    else sessionStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredCouponCode(): void {
  try {
    sessionStorage.removeItem(COUPON_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
