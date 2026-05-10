import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/** Optional physical dimensions (e.g. case diameter note). */
const dimensionsSchema = new Schema(
  {
    displayNote: { type: String, maxlength: 300, trim: true },
    lengthCm: { type: Number, min: 0 },
    widthCm: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
  },
  { _id: false },
);

const watchDetailsSchema = new Schema(
  {
    /** Case outline, e.g. round, square, tonneau */
    caseShape: { type: String, trim: true, maxlength: 80 },
    /** Dial finish / colour / style */
    dial: { type: String, trim: true, maxlength: 120 },
    /** Strap or bracelet type (leather, metal link, rubber, NATO, etc.) */
    strapType: { type: String, trim: true, maxlength: 80 },
    /** Primary colour shown to customers */
    color: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const jewelryDetailsSchema = new Schema(
  {
    /** Primary material, e.g. 925 silver, brass, gold-plated alloy */
    materialType: { type: String, trim: true, maxlength: 120 },
    /** Finish or plating description */
    finishOrPlating: { type: String, trim: true, maxlength: 120 },
    /** Stones, enamel motif, or decorative element */
    stoneOrMotif: { type: String, trim: true, maxlength: 160 },
    /** Engraving, sizing, made-to-order notes */
    customizationNote: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    /** Amount in smallest currency unit (paise for INR) */
    price: { type: Number, required: true, min: 0 },
    /** Optional “was” price for offers (paise) */
    compareAtPrice: { type: Number, min: 0 },
    images: [{ type: String }],
    /** Quantity available (inventory) */
    stock: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },

    /** Broad shelf, e.g. "Watches", "Bracelets" */
    category: { type: String, required: true, trim: true, maxlength: 80, default: 'Watches', index: true },
    /** Finer grouping, e.g. "Dress", "Diver" */
    subcategory: { type: String, trim: true, maxlength: 80 },
    /** Unique stock-keeping id for admin / fulfilment (sparse: legacy products may omit) */
    sku: { type: String, trim: true, uppercase: true, maxlength: 64, unique: true, sparse: true },
    /** SEO / future detail URLs */
    slug: { type: String, trim: true, lowercase: true, maxlength: 120, unique: true, sparse: true },
    /** e.g. "sapphire crystal", "stainless steel" */
    materials: [{ type: String, trim: true, maxlength: 80 }],
    /** Short storefront tags, e.g. "Handcrafted", "Adjustable" */
    tags: [{ type: String, trim: true, maxlength: 48 }],
    dimensions: { type: dimensionsSchema },
    /** Packed weight for shipping estimates */
    weightGrams: { type: Number, min: 0 },
    careInstructions: { type: String, trim: true, maxlength: 2000 },

    watchDetails: { type: watchDetailsSchema },
    jewelryDetails: { type: jewelryDetailsSchema },
    /** Other products (often bracelet SKUs) suggested with this watch */
    matchingBraceletIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    /** Combined price (paise) for this watch + one linked bracelet; validated at checkout */
    watchBraceletBundlePrice: { type: Number, min: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const ProductModel = mongoose.model('Product', productSchema);
