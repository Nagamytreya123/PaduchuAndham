import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isDynamoDbEnabled, getDynamoDoc } from './dynamo/client.js';

export async function connectDb(): Promise<void> {
  if (isDynamoDbEnabled()) {
    getDynamoDoc();
    console.log(`[db] DynamoDB table ${env.DYNAMODB_TABLE}`);
    return;
  }
  await mongoose.connect(env.MONGODB_URI!);
  console.log('[db] MongoDB connected');
}
