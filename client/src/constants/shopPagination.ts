export const SHOP_PAGE_SIZE_OPTIONS = [20, 30, 40] as const;

export type ShopPageSize = (typeof SHOP_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_SHOP_PAGE_SIZE: ShopPageSize = 20;

export function parseShopPageSize(raw: string | null | undefined): ShopPageSize {
  const n = parseInt(raw ?? '', 10);
  return SHOP_PAGE_SIZE_OPTIONS.includes(n as ShopPageSize) ? (n as ShopPageSize) : DEFAULT_SHOP_PAGE_SIZE;
}

export function parseShopPage(raw: string | null | undefined): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
