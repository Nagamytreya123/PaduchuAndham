import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const jewelleryComboSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    /** Hero / card image URLs (admin upload or external URL) */
    images: [{ type: String }],
    /** All jewellery SKUs in this set (order preserved for display) */
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product', required: true }],
    /** Bundle total in paise */
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

jewelleryComboSchema.index({ isActive: 1 });

export type JewelleryComboDoc = InferSchemaType<typeof jewelleryComboSchema>;
export const JewelleryComboModel = mongoose.model('JewelleryCombo', jewelleryComboSchema);
