import { createDynamoModel } from '../db/dynamo/client.js';

export type OrderItemDoc = {
  productId: string;
  name: string;
  price: number;
  qty: number;
};

export type OrderAddressDoc = {
  label?: string;
  recipientName?: string;
  recipientMobile?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type OrderDoc = {
  _id: string;
  user: string;
  items: OrderItemDoc[];
  status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  amount: number;
  currency?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  address: OrderAddressDoc;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const OrderModel = createDynamoModel('Order') as any;
