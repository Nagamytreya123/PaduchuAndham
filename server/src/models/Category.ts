import { createDynamoModel } from '../db/dynamo/client.js';

export const CATEGORY_KINDS = ['watch', 'bracelet', 'jewellery', 'generic'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_SIZE_MODES = ['description', 'option'] as const;
export type CategorySizeMode = (typeof CATEGORY_SIZE_MODES)[number];

export type PriceFilterDoc = {
  id: string;
  label: string;
  minPaise?: number | null;
  maxPaise?: number | null;
  subcategory?: string | null;
};

export type CategoryDoc = {
  _id: string;
  slug: string;
  label: string;
  sortOrder: number;
  kind: CategoryKind;
  tileImageUrl?: string;
  priceFilters?: PriceFilterDoc[];
  priceFiltersEnabled?: boolean;
  subcategories?: string[];
  isCombo?: boolean;
  /** When "option", products in this category expose selectable size options. */
  sizeMode?: CategorySizeMode;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export const CategoryModel = createDynamoModel('Category') as any;
