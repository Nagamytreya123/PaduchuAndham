import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isDynamoDbEnabled, getDynamoDoc } from './dynamo/client.js';

export async function connectDb(): Promise<void> {
  if (isDynamoDbEnabled()) {
    getDynamoDoc();
    console.log(`[db] DynamoDB table ${env.DYNAMODB_TABLE}`);
    return;
  }
  await mongoose.connect(env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  console.log('[db] MongoDB connected');
}
