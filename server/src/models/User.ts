import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const savedAddressSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    recipientName: { type: String, trim: true, maxlength: 120, default: '' },
    recipientMobile: { type: String, trim: true, maxlength: 20, default: '' },
    line1: { type: String, required: true, trim: true, maxlength: 300 },
    line2: { type: String, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, default: 'IN', trim: true, maxlength: 4 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    googleId: { type: String, sparse: true, unique: true },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    avatarUrl: { type: String },
    savedAddresses: { type: [savedAddressSchema], default: [] },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.model('User', userSchema);
