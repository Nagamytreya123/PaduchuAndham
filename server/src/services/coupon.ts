import { CouponModel, type CouponDoc } from '../models/Coupon.js';
import { OrderModel } from '../models/Order.js';
import {
  computeDiscountPaise,
  CouponServiceError,
  couponIsExpired,
  couponSlugFromCode,
  formatDiscountLabel,
  normalizeCouponCode,
  qualifiesForCoupon,
  resolvePerUserLimit,
  serializePublicPromotion,
  userCouponUsageExhausted,
} from '../utils/coupon.js';
import { assertCartAllowsCoupons, resolveCouponDiscountBasePaise, validateCouponCategorySlugs, type CouponCartItem } from '../utils/couponEligibility.js';

const REDEEMED_ORDER_STATUSES = new Set(['paid', 'processing', 'shipped', 'delivered']);

export { CouponServiceError };

export async function findCouponByCode(code: string): Promise<CouponDoc | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const slug = couponSlugFromCode(normalized);
  const rows = (await CouponModel.find({ slug }).lean()) as CouponDoc[];
  return rows[0] ?? null;
}

export async function countCouponRedemptionsForUser(userId: string, couponId: string): Promise<number> {
  const orders = await OrderModel.find({ user: userId, couponId }).lean();
  return orders.filter((order) => REDEEMED_ORDER_STATUSES.has(order.status ?? '')).length;
}

export async function listActivePromotions(
  userId?: string,
  cartItems?: CouponCartItem[],
  subtotalPaise?: number,
): Promise<ReturnType<typeof serializePublicPromotion>[]> {
  const all = (await CouponModel.find({ isActive: true }).lean()) as CouponDoc[];
  const active = all.filter((c) => !couponIsExpired(c));

  let available = active;
  if (userId) {
    const filtered: CouponDoc[] = [];
    for (const coupon of active) {
      const perUserLimit = resolvePerUserLimit(coupon);
      if (perUserLimit == null) {
        filtered.push(coupon);
        continue;
      }
      const userUsageCount = await countCouponRedemptionsForUser(userId, coupon._id);
      if (!userCouponUsageExhausted(perUserLimit, userUsageCount)) {
        filtered.push(coupon);
      }
    }
    available = filtered;
  }

  const hasCartContext = Boolean(cartItems?.length);
  const promotions: ReturnType<typeof serializePublicPromotion>[] = [];

  for (const coupon of available) {
    let eligibleSubtotalPaise: number | undefined;
    if (hasCartContext) {
      eligibleSubtotalPaise = await resolveCouponDiscountBasePaise(
        coupon.categorySlugs,
        subtotalPaise ?? 0,
        cartItems,
      );
      const restricted = (coupon.categorySlugs ?? []).some((s) => s.trim());
      if (restricted && eligibleSubtotalPaise <= 0) continue;
    }

    promotions.push(serializePublicPromotion(coupon, eligibleSubtotalPaise));
  }

  return promotions.sort((a, b) => (a.minSubtotalPaise ?? 0) - (b.minSubtotalPaise ?? 0));
}

export async function listAdminCoupons(): Promise<CouponDoc[]> {
  const rows = (await CouponModel.find({}).sort({ createdAt: -1 }).lean()) as CouponDoc[];
  return rows;
}

export type ValidatedCoupon = {
  couponId: string;
  code: string;
  label: string;
  discountType: CouponDoc['discountType'];
  discountPaise: number;
  discountLabel: string;
  minSubtotalPaise: number;
  subtotalPaise: number;
};

export async function validateCouponDoc(
  coupon: CouponDoc,
  subtotalPaise: number,
  userId: string,
  cartItems?: CouponCartItem[],
): Promise<ValidatedCoupon> {
  if (!coupon.isActive) {
    throw new CouponServiceError('This coupon is not active.', 400, 'COUPON_INACTIVE');
  }
  if (couponIsExpired(coupon)) {
    throw new CouponServiceError('This coupon has expired.', 400, 'COUPON_EXPIRED');
  }

  const perUserLimit = resolvePerUserLimit(coupon);
  if (perUserLimit != null) {
    const userUsageCount = await countCouponRedemptionsForUser(userId, coupon._id);
    if (userCouponUsageExhausted(perUserLimit, userUsageCount)) {
      throw new CouponServiceError('Invalid coupon code.', 404, 'COUPON_NOT_FOUND');
    }
  }

  const discountBasePaise = await resolveCouponDiscountBasePaise(
    coupon.categorySlugs,
    subtotalPaise,
    cartItems,
  );
  if ((coupon.categorySlugs?.length ?? 0) > 0 && discountBasePaise <= 0) {
    throw new CouponServiceError(
      'This coupon does not apply to the categories in your cart.',
      400,
      'COUPON_CATEGORY_MISMATCH',
    );
  }

  if (!qualifiesForCoupon(discountBasePaise, coupon.minSubtotalPaise)) {
    const minRupees = Math.round(coupon.minSubtotalPaise / 100);
    throw new CouponServiceError(
      `Add items worth at least ₹${minRupees.toLocaleString('en-IN')} to use this coupon.`,
      400,
      'COUPON_MIN_NOT_MET',
    );
  }

  const discountPaise = computeDiscountPaise(discountBasePaise, coupon);
  if (discountPaise <= 0) {
    throw new CouponServiceError('This coupon does not apply to your cart.', 400, 'COUPON_NO_DISCOUNT');
  }

  return {
    couponId: coupon._id,
    code: coupon.code,
    label: coupon.label?.trim() || coupon.code,
    discountType: coupon.discountType,
    discountPaise,
    discountLabel: formatDiscountLabel(coupon),
    minSubtotalPaise: coupon.minSubtotalPaise,
    subtotalPaise,
  };
}

export async function validateCouponForCheckout(
  code: string,
  subtotalPaise: number,
  userId: string,
  cartItems?: CouponCartItem[],
): Promise<ValidatedCoupon> {
  if (cartItems?.length) {
    await assertCartAllowsCoupons(cartItems);
  }
  const coupon = await findCouponByCode(code);
  if (!coupon) {
    throw new CouponServiceError('Invalid coupon code.', 404, 'COUPON_NOT_FOUND');
  }
  return validateCouponDoc(coupon, subtotalPaise, userId, cartItems);
}

export type CreateCouponInput = {
  code: string;
  label?: string;
  discountType: CouponDoc['discountType'];
  percentOff?: number;
  fixedOffPaise?: number;
  minSubtotalPaise: number;
  maxDiscountPaise?: number | null;
  isActive?: boolean;
  perUserLimit?: number | null;
  expiresAt?: string | null;
  categorySlugs?: string[];
};

export async function createCoupon(input: CreateCouponInput): Promise<CouponDoc> {
  const code = normalizeCouponCode(input.code);
  if (code.length < 3 || code.length > 24) {
    throw new CouponServiceError('Coupon code must be 3–24 characters.', 400);
  }
  const slug = couponSlugFromCode(code);
  const existing = await CouponModel.find({ slug }).lean();
  if (existing.length > 0) {
    throw new CouponServiceError('A coupon with this code already exists.', 409, 'COUPON_EXISTS');
  }

  validateCouponFields(input);

  const categorySlugs = await validateCouponCategorySlugs(input.categorySlugs);

  const doc = await CouponModel.create({
    slug,
    code,
    label: input.label?.trim() || code,
    discountType: input.discountType,
    percentOff: input.discountType === 'percent' ? input.percentOff : undefined,
    fixedOffPaise: input.discountType === 'fixed' ? input.fixedOffPaise : undefined,
    minSubtotalPaise: input.minSubtotalPaise,
    maxDiscountPaise: input.discountType === 'percent' ? input.maxDiscountPaise ?? null : null,
    isActive: input.isActive !== false,
    perUserLimit: input.perUserLimit ?? null,
    expiresAt: input.expiresAt ?? null,
    categorySlugs,
  });
  return doc.toObject() as CouponDoc;
}

export type UpdateCouponInput = Partial<CreateCouponInput>;

export async function updateCoupon(id: string, input: UpdateCouponInput): Promise<CouponDoc> {
  const coupon = await CouponModel.findById(id);
  if (!coupon) {
    throw new CouponServiceError('Coupon not found.', 404);
  }

  if (input.code !== undefined) {
    const code = normalizeCouponCode(input.code);
    if (code.length < 3 || code.length > 24) {
      throw new CouponServiceError('Coupon code must be 3–24 characters.', 400);
    }
    const slug = couponSlugFromCode(code);
    if (slug !== coupon.slug) {
      const existing = await CouponModel.find({ slug }).lean();
      if (existing.some((row) => String(row._id) !== id)) {
        throw new CouponServiceError('A coupon with this code already exists.', 409, 'COUPON_EXISTS');
      }
      coupon.slug = slug;
      coupon.code = code;
    }
  }

  if (input.label !== undefined) coupon.label = input.label.trim() || coupon.code;
  if (input.discountType !== undefined) coupon.discountType = input.discountType;
  if (input.percentOff !== undefined) coupon.percentOff = input.percentOff;
  if (input.fixedOffPaise !== undefined) coupon.fixedOffPaise = input.fixedOffPaise;
  if (input.minSubtotalPaise !== undefined) coupon.minSubtotalPaise = input.minSubtotalPaise;
  if (input.maxDiscountPaise !== undefined) coupon.maxDiscountPaise = input.maxDiscountPaise;
  if (input.isActive !== undefined) coupon.isActive = input.isActive;
  if (input.perUserLimit !== undefined) {
    coupon.perUserLimit = input.perUserLimit;
    coupon.usageLimit = undefined;
  }
  if (input.expiresAt !== undefined) coupon.expiresAt = input.expiresAt;
  if (input.categorySlugs !== undefined) {
    coupon.categorySlugs = await validateCouponCategorySlugs(input.categorySlugs);
  }

  validateCouponFields({
    code: coupon.code,
    discountType: coupon.discountType,
    percentOff: coupon.percentOff,
    fixedOffPaise: coupon.fixedOffPaise,
    minSubtotalPaise: coupon.minSubtotalPaise,
    maxDiscountPaise: coupon.maxDiscountPaise,
  });

  if (coupon.discountType === 'percent') {
    coupon.fixedOffPaise = undefined;
  } else {
    coupon.percentOff = undefined;
    coupon.maxDiscountPaise = null;
  }

  await coupon.save();
  return coupon.toObject() as CouponDoc;
}

export async function deleteCoupon(id: string): Promise<void> {
  const coupon = await CouponModel.findById(id);
  if (!coupon) {
    throw new CouponServiceError('Coupon not found.', 404);
  }
  await CouponModel.deleteOne({ _id: id });
}

function validateCouponFields(input: {
  code?: string;
  discountType: CouponDoc['discountType'];
  percentOff?: number;
  fixedOffPaise?: number;
  minSubtotalPaise: number;
  maxDiscountPaise?: number | null;
}) {
  if (!Number.isFinite(input.minSubtotalPaise) || input.minSubtotalPaise < 0) {
    throw new CouponServiceError('Minimum cart value must be zero or more.', 400);
  }
  if (input.discountType === 'percent') {
    const pct = input.percentOff ?? 0;
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      throw new CouponServiceError('Percent discount must be between 1 and 100.', 400);
    }
    if (input.maxDiscountPaise != null && input.maxDiscountPaise < 0) {
      throw new CouponServiceError('Maximum discount must be zero or more.', 400);
    }
  } else {
    const fixed = input.fixedOffPaise ?? 0;
    if (!Number.isFinite(fixed) || fixed <= 0) {
      throw new CouponServiceError('Fixed discount must be greater than zero.', 400);
    }
  }
}
