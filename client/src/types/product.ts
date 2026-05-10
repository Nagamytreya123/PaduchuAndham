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

/** Aggregate rating stats returned on product detail and review list APIs */
export type ReviewSummary = {
  reviewCount: number;
  averageRating: number | null;
};

/** When logged in, whether this user may post a review for this product */
export type ViewerReviewEligibility = {
  canSubmit: boolean;
  alreadyReviewed: boolean;
  /** True when the customer has a delivered order that includes this product */
  delivered: boolean;
};

export type ProductReview = {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  reviewerName?: string;
  createdAt: string;
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
  materials: string[];
  tags: string[];
  dimensions?: ProductDimensions;
  weightGrams?: number;
  careInstructions?: string;
  watchDetails?: WatchDetails;
  jewelryDetails?: JewelryDetails;
  /** Present on product detail API responses when linked bracelet products exist */
  matchingBracelets?: ProductSummary[];
  /** Present when admin loads catalog — IDs for editing linked bracelets */
  matchingBraceletIds?: string[];
  /** Combined price (paise) for this watch + one linked matching bracelet */
  watchBraceletBundlePrice?: number;
  /** Present on product detail API */
  reviewSummary?: ReviewSummary;
  /** Present on product detail API when session is resolved */
  viewerReview?: ViewerReviewEligibility | null;
};

/** Admin catalog list item — includes aggregate sales from paid/processing/shipped/delivered orders */
export type AdminProductRow = ProductSummary & { unitsSold: number };

export type AdminSalesSummary = {
  totalUnitsSold: number;
  bySubcategory: Record<string, number>;
};
