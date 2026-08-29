import { connectDb } from './db/connect.js';
import { env } from './config/env.js';
import { ensureCanonicalCategories } from './services/categories.js';
import { connectRedis, disconnectRedis } from './redis/client.js';
import { initRateLimiters } from './middleware/rateLimit.js';
import { createApp } from './app.js';

const app = createApp();
const port = env.PORT;

async function main() {
  await connectDb();
  await ensureCanonicalCategories();
  await connectRedis();
  initRateLimiters();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

async function shutdown() {
  await disconnectRedis();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
