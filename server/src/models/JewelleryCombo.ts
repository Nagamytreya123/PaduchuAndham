import { createDynamoModel } from '../db/dynamo/client.js';

export type JewelleryComboDoc = {
  _id: string;
  name: string;
  images?: string[];
  productIds: string[];
  price: number;
  isActive?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export const JewelleryComboModel = createDynamoModel('JewelleryCombo') as any;
