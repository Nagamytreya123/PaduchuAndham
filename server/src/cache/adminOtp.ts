import crypto from 'node:crypto';
import { KEY_PREFIX } from './constants.js';
import { cacheDel, cacheGet, cacheSet } from './store.js';
import { isRedisCacheEnabled } from '../redis/client.js';

export const ADMIN_OTP_TTL_SEC = 300;
export const ADMIN_OTP_MAX_ATTEMPTS = 5;

export type AdminOtpChallenge = {
  userId: string;
  email: string;
  otpHash: string;
  attempts: number;
};

type MemOtpEntry = { value: AdminOtpChallenge; exp: number };

const memoryOtp = new Map<string, MemOtpEntry>();

function otpKey(challengeId: string): string {
  return `${KEY_PREFIX}:admin-otp:${challengeId}`;
}

function memoryGet(key: string): AdminOtpChallenge | null {
  const row = memoryOtp.get(key);
  if (!row) return null;
  if (row.exp <= Date.now()) {
    memoryOtp.delete(key);
    return null;
  }
  return row.value;
}

function memorySet(key: string, value: AdminOtpChallenge, ttlSeconds: number): void {
  memoryOtp.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
}

export async function getAdminOtpChallenge(challengeId: string): Promise<AdminOtpChallenge | null> {
  const key = otpKey(challengeId);
  if (isRedisCacheEnabled()) {
    const cached = await cacheGet<AdminOtpChallenge>(key);
    return cached ?? null;
  }
  return memoryGet(key);
}

export async function setAdminOtpChallenge(
  challengeId: string,
  challenge: AdminOtpChallenge,
): Promise<void> {
  const key = otpKey(challengeId);
  if (isRedisCacheEnabled()) {
    await cacheSet(key, challenge, ADMIN_OTP_TTL_SEC);
    return;
  }
  memorySet(key, challenge, ADMIN_OTP_TTL_SEC);
}

export async function deleteAdminOtpChallenge(challengeId: string): Promise<void> {
  const key = otpKey(challengeId);
  await cacheDel(key);
  memoryOtp.delete(key);
}

export function generateAdminOtp(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export function hashAdminOtp(challengeId: string, otp: string, secret: string): string {
  return crypto.createHash('sha256').update(`${challengeId}:${otp}:${secret}`).digest('hex');
}

export function newAdminOtpChallengeId(): string {
  return crypto.randomUUID();
}
