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

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
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
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  /** Redis URL (Upstash, Render Redis, etc.). When set, enables catalog cache, session cache, and distributed rate limits. */
  REDIS_URL: z.string().min(1).optional(),
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
  return parsed.data;
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

export function getAdminEmailSet(): Set<string> {
  const raw = env.ADMIN_EMAILS ?? '';
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
