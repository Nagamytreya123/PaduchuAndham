import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { KEY_PREFIX } from '../cache/constants.js';
import { canUseRedisRateLimitStore, RedisRateLimitStore } from './redisRateLimitStore.js';

type LimiterConfig = {
  windowMs: number;
  max: number;
};

function buildLimiter(name: string, config: LimiterConfig): RateLimitRequestHandler {
  const useRedis = canUseRedisRateLimitStore();
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(useRedis
      ? {
          store: new RedisRateLimitStore({
            prefix: `${KEY_PREFIX}:rl:${name}:`,
            windowMs: config.windowMs,
          }),
        }
      : {}),
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
  const useRedis = canUseRedisRateLimitStore();
  limiters.api = buildLimiter('api', { windowMs: 15 * 60 * 1000, max: 400 });
  limiters.publicCatalog = buildLimiter('public-catalog', { windowMs: 60 * 1000, max: 120 });
  limiters.checkout = buildLimiter('checkout', { windowMs: 15 * 60 * 1000, max: 60 });
  limiters.auth = buildLimiter('auth', { windowMs: 15 * 60 * 1000, max: 100 });
  console.log(`[rate-limit] ready (${useRedis ? 'redis' : 'in-memory'})`);
}

export const apiLimiter = delegate(() => limiters.api);
export const publicCatalogLimiter = delegate(() => limiters.publicCatalog);
export const checkoutLimiter = delegate(() => limiters.checkout);
export const authLimiter = delegate(() => limiters.auth);
