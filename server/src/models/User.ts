import { createDynamoModel } from '../db/dynamo/client.js';

export type SavedAddressDoc = {
  _id?: string;
  label: string;
  recipientName?: string;
  recipientMobile?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type UserDoc = {
  _id: string;
  email: string;
  name: string;
  googleId?: string;
  role?: 'customer' | 'admin';
  avatarUrl?: string;
  savedAddresses?: SavedAddressDoc[];
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
};

export const UserModel = createDynamoModel('User') as any;
