import type { ProductSummary } from './product';

export type JewelleryComboSummary = {
  id: string;
  name: string;
  images: string[];
  productIds: string[];
  price: number;
  isActive?: boolean;
};

export type JewelleryComboDetail = JewelleryComboSummary & {
  products: ProductSummary[];
};
