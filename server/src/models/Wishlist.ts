import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const wishlistItemSchema = new Schema(
  {
    /** Product id or legacy combo id (e.g. combo:…) */
    id: { type: String, required: true, trim: true, maxlength: 120 },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    href: { type: String, required: true, trim: true, maxlength: 500 },
    savedAt: { type: Number, required: true },
  },
  { _id: false },
);

const wishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true },
);

export type WishlistDoc = InferSchemaType<typeof wishlistSchema>;
export const WishlistModel = mongoose.model('Wishlist', wishlistSchema);
