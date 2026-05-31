import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { RequestHandler } from 'express';

type LimiterConfig = {
  windowMs: number;
  max: number;
};

/** In-memory only — Upstash read-only tokens cannot run INCR (required for Redis rate stores). */
function buildLimiter(_name: string, config: LimiterConfig): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

const limiters = {
  api: null as RateLimitRequestHandler | null,
  publicCatalog: null as RateLimitRequestHandler | null,
  checkout: null as RateLimitRequestHandler | null,
  auth: null as RateLimitRequestHandler | null,
};

function delegate(getHandler: () => RateLimitRequestHandler | null): RequestHandler {
  return (req, res, next) => {
    const handler = getHandler();
    if (!handler) {
      next(new Error('Rate limiters not initialized. Call initRateLimiters() after connectRedis().'));
      return;
    }
    return handler(req, res, next);
  };
}

/** Call once after connectRedis() and before accepting traffic. */
export function initRateLimiters(): void {
  limiters.api = buildLimiter('api', { windowMs: 15 * 60 * 1000, max: 400 });
  limiters.publicCatalog = buildLimiter('public-catalog', { windowMs: 60 * 1000, max: 120 });
  limiters.checkout = buildLimiter('checkout', { windowMs: 15 * 60 * 1000, max: 60 });
  limiters.auth = buildLimiter('auth', { windowMs: 15 * 60 * 1000, max: 100 });
  console.log('[rate-limit] ready (in-memory)');
}

export const apiLimiter = delegate(() => limiters.api);
export const publicCatalogLimiter = delegate(() => limiters.publicCatalog);
export const checkoutLimiter = delegate(() => limiters.checkout);
export const authLimiter = delegate(() => limiters.auth);
