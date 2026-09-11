import { CategoryModel } from '../models/Category.js';
import { ProductModel, type ProductDoc } from '../models/Product.js';
import { CouponServiceError } from '../utils/coupon.js';

export const COUPON_COMBO_EXCLUDED_MESSAGE =
  'Coupons cannot be used when your cart includes combo or bundle items.';

export const COUPON_CATEGORY_MISMATCH_MESSAGE =
  'This coupon does not apply to the categories in your cart.';

export type CouponCartItem = {
  productId: string;
  bundleGroupId?: string;
  unitPricePaise?: number;
  qty?: number;
};

type CategoryRow = { slug: string; label: string };

function productMatchesCategoryRow(productCategory: string, cat: CategoryRow): boolean {
  const a = productCategory.trim().toLowerCase();
  if (!a) return false;
  return a === cat.slug.toLowerCase() || a === cat.label.toLowerCase();
}

export function productEligibleForCouponSlugs(
  productCategory: string,
  allowedSlugs: string[],
  categories: CategoryRow[],
): boolean {
  if (!allowedSlugs.length) return true;
  const allowed = new Set(allowedSlugs.map((s) => s.trim().toLowerCase()));
  return categories.some(
    (c) => allowed.has(c.slug.toLowerCase()) && productMatchesCategoryRow(productCategory, c),
  );
}

/** Subtotal (paise) of cart lines in coupon-allowed categories. Unrestricted coupons use full cart subtotal. */
export async function resolveCouponDiscountBasePaise(
  allowedCategorySlugs: string[] | null | undefined,
  fullSubtotalPaise: number,
  items: CouponCartItem[] | undefined,
): Promise<number> {
  const slugs = (allowedCategorySlugs ?? []).map((s) => s.trim()).filter(Boolean);
  if (!slugs.length) return fullSubtotalPaise;
  if (!items?.length) return 0;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const [products, categories] = await Promise.all([
    ProductModel.find({ _id: { $in: productIds } })
      .select('category price')
      .lean() as Promise<Pick<ProductDoc, '_id' | 'category' | 'price'>[]>,
    CategoryModel.find({ isActive: true }).select('slug label').lean() as Promise<CategoryRow[]>,
  ]);
  const productById = new Map(products.map((p) => [String(p._id), p]));

  let eligible = 0;
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) continue;
    if (!productEligibleForCouponSlugs(String(product.category ?? ''), slugs, categories)) continue;
    const unit = item.unitPricePaise ?? product.price ?? 0;
    const qty = item.qty ?? 1;
    if (unit > 0 && qty > 0) eligible += unit * qty;
  }
  return eligible;
}

export async function validateCouponCategorySlugs(slugs: string[] | undefined): Promise<string[]> {
  const normalized = [...new Set((slugs ?? []).map((s) => s.trim()).filter(Boolean))];
  if (!normalized.length) return [];

  const rows = (await CategoryModel.find({ isActive: true }).select('slug').lean()) as Array<{ slug: string }>;
  const valid = new Set(rows.map((r) => r.slug));
  for (const slug of normalized) {
    if (!valid.has(slug)) {
      throw new CouponServiceError(`Unknown category: ${slug}`, 400, 'COUPON_INVALID_CATEGORY');
    }
  }
  return normalized;
}

function categoryMatchesComboSet(category: string, comboSlugs: Set<string>): boolean {
  const cat = category.trim().toLowerCase();
  return Boolean(cat && comboSlugs.has(cat));
}

export async function assertCartAllowsCoupons(items: CouponCartItem[]): Promise<void> {
  if (items.length === 0) return;

  if (items.some((i) => i.bundleGroupId?.trim())) {
    throw new CouponServiceError(COUPON_COMBO_EXCLUDED_MESSAGE, 400, 'COUPON_COMBO_EXCLUDED');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const [products, comboCategories] = await Promise.all([
    ProductModel.find({ _id: { $in: productIds } })
      .select('category comboProductIds price')
      .lean() as Promise<Pick<ProductDoc, '_id' | 'category' | 'comboProductIds' | 'price'>[]>,
    CategoryModel.find({ isCombo: true, isActive: true }).select('slug label').lean(),
  ]);

  const comboSlugs = new Set<string>();
  for (const c of comboCategories) {
    comboSlugs.add(String(c.slug ?? '').trim().toLowerCase());
    comboSlugs.add(String(c.label ?? '').trim().toLowerCase());
  }

  const productById = new Map(products.map((p) => [String(p._id), p]));

  for (const item of items) {
    const p = productById.get(item.productId);
    if (!p) continue;

    if ((p.comboProductIds?.length ?? 0) >= 2) {
      throw new CouponServiceError(COUPON_COMBO_EXCLUDED_MESSAGE, 400, 'COUPON_COMBO_EXCLUDED');
    }

    if (categoryMatchesComboSet(String(p.category ?? ''), comboSlugs)) {
      throw new CouponServiceError(COUPON_COMBO_EXCLUDED_MESSAGE, 400, 'COUPON_COMBO_EXCLUDED');
    }

    if (
      item.unitPricePaise !== undefined &&
      Number.isInteger(item.unitPricePaise) &&
      item.unitPricePaise !== p.price
    ) {
      throw new CouponServiceError(COUPON_COMBO_EXCLUDED_MESSAGE, 400, 'COUPON_COMBO_EXCLUDED');
    }
  }
}
