import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { pickModel } from './pick.js';

export const CATEGORY_KINDS = ['watch', 'bracelet', 'jewellery', 'generic'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

const priceFilterSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    minPaise: { type: Number, default: null, min: 0 },
    maxPaise: { type: Number, default: null, min: 0 },
    /** Null/empty = applies to the whole category; otherwise a product subcategory label. */
    subcategory: { type: String, default: null, trim: true, maxlength: 80 },
  },
  { _id: false },
);

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 80 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, required: true, default: 0 },
    kind: { type: String, required: true, enum: CATEGORY_KINDS, default: 'generic' },
    tileImageUrl: { type: String, trim: true, default: '' },
    priceFilters: { type: [priceFilterSchema], default: [] },
    priceFiltersEnabled: { type: Boolean, default: true },
    /** Admin-defined subcategory labels shown in shop filters and product forms. */
    subcategories: { type: [String], default: [] },
    /** When true, products in this category are combo sets linking other products. */
    isCombo: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
const MongoCategoryModel = mongoose.model('Category', categorySchema);
export const CategoryModel = pickModel(MongoCategoryModel, 'Category') as typeof MongoCategoryModel;

