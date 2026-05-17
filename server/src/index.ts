import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { connectDb } from './db/connect.js';
import { env } from './config/env.js';
import { optionalAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import adminProductsRoutes from './routes/adminProducts.js';
import ordersRoutes from './routes/orders.js';
import adminOrdersRoutes from './routes/adminOrders.js';
import adminReviewsRoutes from './routes/adminReviews.js';
import adminJewelleryCombosRoutes from './routes/adminJewelleryCombos.js';
import jewelleryCombosRoutes from './routes/jewelleryCombos.js';
import cartRoutes from './routes/cart.js';
import webhookRoutes from './routes/webhooks.js';
import meRoutes from './routes/me.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api/webhooks', webhookRoutes);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(passport.initialize());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', optionalAuth, authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/cart', optionalAuth, cartRoutes);
app.use('/api/products', optionalAuth, productsRoutes);
app.use('/api/jewellery-combos', optionalAuth, jewelleryCombosRoutes);
app.use('/api/admin/products', optionalAuth, adminProductsRoutes);
app.use('/api/admin/jewellery-combos', optionalAuth, adminJewelleryCombosRoutes);
app.use('/api/orders', optionalAuth, ordersRoutes);
app.use('/api/admin/orders', optionalAuth, adminOrdersRoutes);
app.use('/api/admin/reviews', optionalAuth, adminReviewsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const port = env.PORT;

async function main() {
  await connectDb();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
