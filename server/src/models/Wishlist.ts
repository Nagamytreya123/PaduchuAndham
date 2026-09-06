import { createDynamoModel } from '../db/dynamo/client.js';

export type WishlistItemDoc = {
  id: string;
  name: string;
  price: number;
  image?: string;
  subtitle?: string;
  href: string;
  savedAt: number;
};

export type WishlistDoc = {
  _id: string;
  user: string;
  items: WishlistItemDoc[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const WishlistModel = createDynamoModel('Wishlist') as any;
