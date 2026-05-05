import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/** Optional physical dimensions (e.g. saree length, jewellery band size). */
const dimensionsSchema = new Schema(
  {
    /** Human-readable size line shown to customers, e.g. "5.5 m with blouse piece" */
    displayNote: { type: String, maxlength: 300, trim: true },
    lengthCm: { type: Number, min: 0 },
    widthCm: { type: Number, min: 0 },
    heightCm: { type: Number, min: 0 },
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

    /** Broad shelf, e.g. "Sarees", "Handmade Jewellery" */
    category: { type: String, required: true, trim: true, maxlength: 80, default: 'General', index: true },
    /** Finer grouping, e.g. "Kanchipuram", "Temple necklace" */
    subcategory: { type: String, trim: true, maxlength: 80 },
    /** Unique stock-keeping id for admin / fulfilment (sparse: legacy products may omit) */
    sku: { type: String, trim: true, uppercase: true, maxlength: 64, unique: true, sparse: true },
    /** SEO / future detail URLs */
    slug: { type: String, trim: true, lowercase: true, maxlength: 120, unique: true, sparse: true },
    tags: [{ type: String, trim: true, maxlength: 40 }],
    /** e.g. "pure mulberry silk", "nickel-free brass" */
    materials: [{ type: String, trim: true, maxlength: 80 }],
    dimensions: { type: dimensionsSchema },
    /** Packed weight for shipping estimates */
    weightGrams: { type: Number, min: 0 },
    careInstructions: { type: String, trim: true, maxlength: 2000 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const ProductModel = mongoose.model('Product', productSchema);
