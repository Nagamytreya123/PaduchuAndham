import { createDynamoModel } from '../db/dynamo/client.js';

export type ProductDimensions = {
  displayNote?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type WatchDetails = {
  caseShape?: string;
  dial?: string;
  strapType?: string;
  color?: string;
};

export type JewelryDetails = {
  materialType?: string;
  finishOrPlating?: string;
  stoneOrMotif?: string;
  customizationNote?: string;
};

export type ProductDoc = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  stock: number;
  isActive?: boolean;
  category: string;
  subcategory?: string;
  sku?: string;
  slug?: string;
  materials?: string[];
  tags?: string[];
  dimensions?: ProductDimensions;
  weightGrams?: number;
  careInstructions?: string;
  watchDetails?: WatchDetails;
  jewelryDetails?: JewelryDetails;
  matchingBraceletIds?: string[];
  watchBraceletBundlePrice?: number;
  comboProductIds?: string[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const ProductModel = createDynamoModel('Product') as any;
