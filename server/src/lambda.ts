import { configure as serverlessExpress } from '@vendia/serverless-express';
import type { Handler } from 'aws-lambda';
import { connectDb } from './db/connect.js';
import { ensureCanonicalCategories } from './services/categories.js';
import { connectRedis } from './redis/client.js';
import { initRateLimiters } from './middleware/rateLimit.js';
import { createApp } from './app.js';

let initialized = false;
let handler: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  if (!initialized) {
    await connectDb();
    await ensureCanonicalCategories();
    await connectRedis();
    initRateLimiters();
    initialized = true;
  }
  const app = createApp();
  return serverlessExpress({ app });
}

export const main: Handler = async (event, context, callback) => {
  if (!handler) {
    handler = await bootstrap();
  }
  return handler(event, context, callback);
};
