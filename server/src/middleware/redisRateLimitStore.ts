import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import { getRedis, isRedisCacheEnabled } from '../redis/client.js';

type RedisStoreOptions = {
  prefix: string;
  windowMs: number;
};

/**
 * Minimal Redis store for express-rate-limit v7 using ioredis INCR + EXPIRE.
 */
export class RedisRateLimitStore implements Store {
  prefix: string;
  windowMs: number;
  localKeys = true;

  constructor(options: RedisStoreOptions) {
    this.prefix = options.prefix;
    this.windowMs = options.windowMs;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(id: string): string {
    return `${this.prefix}${id}`;
  }

  async increment(id: string): Promise<ClientRateLimitInfo> {
    if (!isRedisCacheEnabled()) {
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
    try {
      const redisKey = this.key(id);
      const ttlSec = Math.ceil(this.windowMs / 1000);
      const hits = await getRedis().incr(redisKey);
      if (hits === 1) {
        await getRedis().expire(redisKey, ttlSec);
      }
      const pttl = await getRedis().pttl(redisKey);
      const resetTime =
        pttl > 0 ? new Date(Date.now() + pttl) : new Date(Date.now() + this.windowMs);
      return { totalHits: hits, resetTime };
    } catch (err) {
      console.warn('[rate-limit] redis increment failed — allowing request', err);
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(id: string): Promise<void> {
    if (!isRedisCacheEnabled()) return;
    try {
      const redisKey = this.key(id);
      const hits = await getRedis().decr(redisKey);
      if (hits <= 0) {
        await getRedis().del(redisKey);
      }
    } catch {
      /* ignore */
    }
  }

  async resetKey(id: string): Promise<void> {
    if (!isRedisCacheEnabled()) return;
    try {
      await getRedis().del(this.key(id));
    } catch {
      /* ignore */
    }
  }
}

export function canUseRedisRateLimitStore(): boolean {
  return isRedisCacheEnabled();
}
