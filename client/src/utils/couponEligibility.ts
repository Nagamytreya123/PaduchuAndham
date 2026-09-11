import type { CartLine } from '../context/CartContext';

export const COUPON_COMBO_EXCLUDED_MESSAGE =
  'Coupons cannot be used when your cart includes combo or bundle items.';

/** True when cart has watch+bracelet bundles, jewellery combos, or combo-category sets. */
export function cartBlocksCoupons(lines: CartLine[]): boolean {
  return lines.some((l) => Boolean(l.bundleGroupId?.trim()));
}

export function cartItemsForCouponApi(lines: CartLine[]) {
  return lines.map((l) => ({
    productId: l.productId,
    qty: l.qty,
    unitPricePaise: l.price,
    ...(l.bundleGroupId?.trim() ? { bundleGroupId: l.bundleGroupId.trim() } : {}),
  }));
}
