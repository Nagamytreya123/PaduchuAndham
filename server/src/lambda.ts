import { configure as serverlessExpress } from '@vendia/serverless-express';
import type { Handler, SQSEvent } from 'aws-lambda';
import { connectDb } from './db/connect.js';
import { ensureCanonicalCategories } from './services/categories.js';
import { connectRedis } from './redis/client.js';
import { initRateLimiters } from './middleware/rateLimit.js';
import { processEmailQueueEvent } from './queue/emailQueue.js';
import { createApp } from './app.js';

let initialized = false;
let handler: Handler | undefined;

function isSqsEvent(event: unknown): event is SQSEvent {
  if (!event || typeof event !== 'object') return false;
  const records = (event as SQSEvent).Records;
  return (
    Array.isArray(records) &&
    records.length > 0 &&
    records[0]?.eventSource === 'aws:sqs'
  );
}

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
  if (isSqsEvent(event)) {
    if (!initialized) {
      await connectDb();
      await connectRedis();
      initialized = true;
    }
    return processEmailQueueEvent(event);
  }

  if (!handler) {
    handler = await bootstrap();
  }
  return handler(event, context, callback);
};
