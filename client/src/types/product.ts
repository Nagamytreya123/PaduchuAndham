export type ProductDimensions = {
  displayNote?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type ProductSummary = {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  stock: number;
  isActive?: boolean;
  category: string;
  subcategory?: string;
  sku?: string;
  slug?: string;
  tags: string[];
  materials: string[];
  dimensions?: ProductDimensions;
  weightGrams?: number;
  careInstructions?: string;
};
