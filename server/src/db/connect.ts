import { env } from '../config/env.js';
import { getDynamoDoc } from './dynamo/client.js';

export async function connectDb(): Promise<void> {
  getDynamoDoc();
  console.log(`[db] DynamoDB table ${env.DYNAMODB_TABLE}`);
}
