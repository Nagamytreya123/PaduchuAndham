import { createDynamoModel } from '../db/dynamo/client.js';

/** Customer can review only after the order line is marked delivered (fulfilment complete). */
export const REVIEW_ELIGIBLE_ORDER_STATUSES = ['delivered'] as const;

export type ReviewDoc = {
  _id: string;
  user: string;
  product: string;
  order: string;
  rating: number;
  title?: string;
  body: string;
  reviewerName: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const ReviewModel = createDynamoModel('Review') as any;
