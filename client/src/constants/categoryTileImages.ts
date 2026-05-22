import type { JewellerySubcategoryPreset } from './jewellerySubcategories';
import { unsplashUrl } from './verifiedProductImages';

/**
 * Reliable storefront category tile images (do not depend on API product URLs).
 */
export const JEWELLERY_CATEGORY_TILE_IMAGES: Record<JewellerySubcategoryPreset, string> = {
  Necklaces: unsplashUrl('1599643478518-a784e5dc4c8f', 640),
  Earrings: unsplashUrl('1558618666-fcd25c85cd64', 640),
  Bangles: unsplashUrl('1585123334904-845d60e97b29', 640),
  Rings: unsplashUrl('1509042239860-f550ce710b93', 640),
  Chains: unsplashUrl('1573408301185-9146fe634ad0', 640),
};

export const WATCH_CATEGORY_TILE_IMAGE = unsplashUrl('1523275335684-37898b6baf30', 640);

export const BRACELET_CATEGORY_TILE_IMAGE = unsplashUrl('1547996160-81dfa63595aa', 640);

export const COMBO_CATEGORY_TILE_IMAGE = unsplashUrl('1599643478518-a784e5dc4c8f', 640);
