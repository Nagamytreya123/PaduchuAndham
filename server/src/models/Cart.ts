import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const CartModel = mongoose.model('Cart', cartSchema);
