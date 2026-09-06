import { createDynamoModel } from '../db/dynamo/client.js';

export type CartItemDoc = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  bundleGroupId?: string;
  bundleDisplayName?: string;
  bundleUnitTotalPaise?: number;
  bundleImage?: string;
};

export type CartDoc = {
  _id: string;
  user: string;
  items: CartItemDoc[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const CartModel = createDynamoModel('Cart') as any;
