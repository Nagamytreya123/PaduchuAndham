import { KEY_PREFIX } from './constants.js';
import { getRedis, isRedisCacheEnabled } from '../redis/client.js';

const IDEMPOTENCY_TTL_SEC = 86_400;

function paymentKey(paymentId: string): string {
  return `${KEY_PREFIX}:idempotency:payment:${paymentId}`;
}

/**
 * Returns true when this payment should be processed (first caller wins).
 * When Redis is unavailable, returns true and relies on order.status checks.
 */
export async function acquirePaymentIdempotency(paymentId: string): Promise<boolean> {
  const id = paymentId.trim();
  if (!id) return true;
  if (!isRedisCacheEnabled()) return true;
  try {
    const result = await getRedis().set(paymentKey(id), '1', 'EX', IDEMPOTENCY_TTL_SEC, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error('[idempotency] acquire failed', err);
    return true;
  }
}

export async function releasePaymentIdempotency(paymentId: string): Promise<void> {
  const id = paymentId.trim();
  if (!id || !isRedisCacheEnabled()) return;
  try {
    await getRedis().del(paymentKey(id));
  } catch (err) {
    console.error('[idempotency] release failed', err);
  }
}
