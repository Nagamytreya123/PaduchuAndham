import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { optionalAuth } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import {
  isRedisCacheEnabled,
  isRedisConnected,
  isRedisEnabled,
  isRedisWriteEnabled,
} from './redis/client.js';
import { readCatalogVersion } from './cache/catalog.js';
import { isEmailQueueEnabled } from './queue/emailQueue.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import adminProductsRoutes from './routes/adminProducts.js';
import ordersRoutes from './routes/orders.js';
import adminOrdersRoutes from './routes/adminOrders.js';
import adminReviewsRoutes from './routes/adminReviews.js';
import adminJewelleryCombosRoutes from './routes/adminJewelleryCombos.js';
import jewelleryCombosRoutes from './routes/jewelleryCombos.js';
import cartRoutes from './routes/cart.js';
import wishlistRoutes from './routes/wishlist.js';
import webhookRoutes from './routes/webhooks.js';
import meRoutes from './routes/me.js';
import siteSettingsRoutes from './routes/siteSettings.js';
import adminSiteSettingsRoutes from './routes/adminSiteSettings.js';
import adminCategoriesRoutes from './routes/adminCategories.js';
import categoriesRoutes from './routes/categories.js';
import { serveUploadFromS3 } from './utils/s3Upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function allowedClientOrigins(): string[] {
  const origins = new Set<string>();
  try {
    const client = new URL(env.CLIENT_URL);
    origins.add(client.origin);
    const host = client.hostname;
    if (host.startsWith('www.')) {
      origins.add(`${client.protocol}//${host.slice(4)}`);
    } else if (host.split('.').length >= 2) {
      origins.add(`${client.protocol}//www.${host}`);
    }
  } catch {
    origins.add(env.CLIENT_URL);
  }
  if (env.NODE_ENV === 'production') {
    origins.add('http://localhost:8000');
    origins.add('http://127.0.0.1:8000');
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
  }
  return [...origins];
}

const clientOrigins = allowedClientOrigins();

export function createApp(): express.Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || clientOrigins.includes(origin)) {
          callback(null, origin ?? clientOrigins[0]);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );

  app.use(serveUploadFromS3);
  const uploadsDir = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api/webhooks', webhookRoutes);

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(passport.initialize());

  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    const redisEnabled = isRedisEnabled();
    const cacheEnabled = isRedisCacheEnabled();
    res.json({
      ok: true,
      database: 'dynamodb',
      dynamoTable: env.DYNAMODB_TABLE ?? null,
      emailQueue: isEmailQueueEnabled(),
      redis: redisEnabled
        ? {
            enabled: true,
            connected: isRedisConnected(),
            writeEnabled: isRedisWriteEnabled(),
            cacheEnabled,
            catalogVersion: await readCatalogVersion(),
            status: cacheEnabled
              ? 'read-write'
              : isRedisConnected()
                ? 'read-only'
                : 'disconnected',
          }
        : { enabled: false, status: 'not-configured' },
    });
  });

  app.use('/api/auth', optionalAuth, authRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/cart', optionalAuth, cartRoutes);
  app.use('/api/wishlist', optionalAuth, wishlistRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/products', optionalAuth, productsRoutes);
  app.use('/api/jewellery-combos', optionalAuth, jewelleryCombosRoutes);
  app.use('/api/admin/products', optionalAuth, adminProductsRoutes);
  app.use('/api/admin/jewellery-combos', optionalAuth, adminJewelleryCombosRoutes);
  app.use('/api/orders', optionalAuth, ordersRoutes);
  app.use('/api/admin/orders', optionalAuth, adminOrdersRoutes);
  app.use('/api/site-settings', siteSettingsRoutes);
  app.use('/api/admin/site-settings', optionalAuth, adminSiteSettingsRoutes);
  app.use('/api/admin/categories', optionalAuth, adminCategoriesRoutes);
  app.use('/api/admin/reviews', optionalAuth, adminReviewsRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api] unhandled error', err);
    if (res.headersSent) return;
    const message = err instanceof Error ? err.message : 'Server error';
    res.status(500).json({ error: message });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
