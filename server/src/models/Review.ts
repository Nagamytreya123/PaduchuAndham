import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/** Customer can review only after the order line is marked delivered (fulfilment complete). */
export const REVIEW_ELIGIBLE_ORDER_STATUSES = ['delivered'] as const;

const reviewSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    /** Order that proves the customer bought this product (any line with matching productId). */
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 200, trim: true },
    body: { type: String, required: true, minlength: 1, maxlength: 4000, trim: true },
    /** Snapshot at post time for display without joining User. */
    reviewerName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof reviewSchema>;
export const ReviewModel = mongoose.model('Review', reviewSchema);
