import mongoose, { Schema, type InferSchemaType } from 'mongoose';

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
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const UserModel = mongoose.model('User', userSchema);
