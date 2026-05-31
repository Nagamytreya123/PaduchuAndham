import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { KEY_PREFIX } from '../cache/constants.js';

let client: Redis | null = null;
let connected = false;
/** True only if SET/DEL succeed (read-write token). Upstash read-only URLs deny INCR/SET. */
let writeEnabled = false;

export function isRedisEnabled(): boolean {
  return Boolean(env.REDIS_URL?.trim());
}

/** Use for catalog/session cache — requires read-write Redis. */
export function isRedisCacheEnabled(): boolean {
  return connected && writeEnabled;
}

export function isRedisWriteEnabled(): boolean {
  return writeEnabled;
}

export function getRedis(): Redis {
  if (!client) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return client;
}

export function isRedisConnected(): boolean {
  return connected && client?.status === 'ready';
}

async function probeWriteAccess(): Promise<boolean> {
  if (!client) return false;
  const key = `${KEY_PREFIX}:write-probe`;
  try {
    await client.set(key, '1', 'EX', 10);
    await client.del(key);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      '[redis] This URL is read-only or missing write permissions (SET/INCR denied).',
      'Catalog cache disabled; rate limits use in-memory.',
      'In Upstash, copy the TCP tab URL from your database (not a read-only replica).',
      msg,
    );
    return false;
  }
}

/** Connect when REDIS_URL is set; no-op otherwise. */
export async function connectRedis(): Promise<void> {
  const url = env.REDIS_URL?.trim();
  if (!url) {
    console.log('[redis] REDIS_URL not set — caching disabled.');
    return;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: false,
  });

  client.on('error', (err: Error) => {
    console.error('[redis] connection error:', err.message);
    connected = false;
    writeEnabled = false;
  });

  client.on('ready', () => {
    connected = true;
  });

  await client.ping();
  connected = true;
  writeEnabled = await probeWriteAccess();

  if (writeEnabled) {
    console.log('[redis] connected (read-write — catalog cache enabled)');
  } else {
    console.log('[redis] connected (read-only — catalog cache disabled, in-memory rate limits)');
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    connected = false;
    writeEnabled = false;
  }
}

/** New catalog version id (SET-based; no INCR). */
export function newCatalogVersionToken(): string {
  return randomUUID();
}
