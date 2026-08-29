import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig, parse as dotenvParse } from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const serverEnvPath = path.resolve(__dirname, '../../.env');

// Root first. Then merge server/.env entries only when non-empty, so blanks in server/.env never wipe Razorpay (etc.) defined in root .env.
dotenvConfig({ path: rootEnvPath });
if (fs.existsSync(serverEnvPath)) {
  const parsed = dotenvParse(fs.readFileSync(serverEnvPath, 'utf8'));
  for (const [key, raw] of Object.entries(parsed)) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value !== '') process.env[key] = raw.trim();
  }
}

for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'] as const) {
  const v = process.env[key];
  if (v !== undefined && v.trim() === '') Reflect.deleteProperty(process.env, key);
}

for (const key of [
  'REDIS_URL',
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ADMIN_EMAILS',
  'ADMIN_ORDER_NOTIFY_EMAIL',
  'RAZORPAY_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'S3_UPLOADS_BUCKET',
  'DYNAMODB_TABLE',
  'SERVER_PUBLIC_URL',
] as const) {
  const v = process.env[key];
  if (v !== undefined && v.trim() === '') Reflect.deleteProperty(process.env, key);
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  /** MongoDB — optional when DYNAMODB_TABLE is set */
  MONGODB_URI: z.string().min(1).optional(),
  /** DynamoDB table name (serverless stack). When set, replaces MongoDB. */
  DYNAMODB_TABLE: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16),
  JWT_COOKIE_NAME: z.string().default('token'),
  CLIENT_URL: z.string().url(),
  SERVER_PUBLIC_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  /** Comma-separated inboxes that receive “new paid order” email alerts */
  ADMIN_ORDER_NOTIFY_EMAIL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  /** Redis URL (Upstash, Render Redis, etc.). When set, enables catalog cache, session cache, and distributed rate limits. */
  REDIS_URL: z.string().min(1).optional(),
  /** S3 bucket for jewellery-combo uploads (e.g. paduchuandham-uploads-prod). When set, combo images go to S3 instead of local disk. */
  S3_UPLOADS_BUCKET: z.string().min(1).optional(),
  /** AWS region for S3 (App Runner IAM role provides credentials). */
  AWS_REGION: z.string().default('ap-south-1'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Invalid environment: ${JSON.stringify(msg)}. Copy .env.example to .env in the project root or to server/.env and set the required variables.`,
    );
  }
  const data = parsed.data;
  if (!data.DYNAMODB_TABLE?.trim() && !data.MONGODB_URI?.trim()) {
    throw new Error('Set MONGODB_URI or DYNAMODB_TABLE');
  }
  return data;
}

export const env = load();

if (
  env.NODE_ENV === 'development' &&
  !(env.RAZORPAY_KEY_ID?.trim() && env.RAZORPAY_KEY_SECRET?.trim())
) {
  console.warn(
    `[env] Razorpay keys are missing after load. Checked root .env at ${rootEnvPath} (exists: ${fs.existsSync(rootEnvPath)}).`,
    fs.existsSync(serverEnvPath)
      ? `Also server/.env at ${serverEnvPath} (non-empty lines override empty ones only—see env.ts).`
      : '',
    'If Cursor shows keys but checkout fails: save `.env` to disk (Ctrl+S), then restart `npm run dev`.',
  );
}

if (env.NODE_ENV !== 'test' && !env.SMTP_HOST?.trim()) {
  console.warn(
    '[env] Order confirmation emails are disabled: set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env (see .env.example).',
    'Admin alerts use ADMIN_ORDER_NOTIFY_EMAIL, or fall back to ADMIN_EMAILS.',
  );
}

export function getAdminEmailSet(): Set<string> {
  const raw = [env.ADMIN_EMAILS, process.env.SEED_ADMIN_EMAIL].filter(Boolean).join(',');
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
