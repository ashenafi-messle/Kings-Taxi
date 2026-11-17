import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { validateDatabaseIsolationAtStartup } from './database-isolation';

// Load appropriate .env file based on NODE_ENV with path fallback
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'test' ? '.env.test' : '.env';

const potentialPaths = [
  path.resolve(process.cwd(), envFile),
  path.resolve(process.cwd(), 'backend', envFile),
  path.resolve(__dirname, '../../', envFile),
];

for (const p of potentialPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('*'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Email / SMTP (Brevo, Resend, Standard SMTP)
  BREVO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Kings Taxi <ashenafimesele78@gmail.com>'),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default('KingstaxiBot'),
  TELEGRAM_BOT_LINK: z.string().default('https://t.me/KingstaxiBot'),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),

  // Cloudinary Image Storage
  CLOUDINARY_CLOUD_NAME: z.string().default('kings-taxi'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Optional future service credentials
  CHAPA_SECRET_KEY: z.string().optional(),
  CHAPA_PUBLIC_KEY: z.string().optional(),

  // Render Deployment & SSH Tunnel Configuration
  SSH_KEY_PATH: z.string().optional(),
  SSH_KNOWN_HOSTS_PATH: z.string().optional(),
  RENDER: z.string().optional(),
  STRICT_DB_ISOLATION: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export type Env = z.infer<typeof envSchema>;

function normalizeDatabaseUrl(urlStr: string): string {
  if (!urlStr || !urlStr.startsWith('postgresql://')) return urlStr;
  let normalized = urlStr;
  const prefix = 'postgresql://';
  const rest = urlStr.slice(prefix.length);
  const colonIdx = rest.indexOf(':');
  const lastAtIdx = rest.lastIndexOf('@');
  if (colonIdx !== -1 && lastAtIdx !== -1 && lastAtIdx > colonIdx) {
    const user = rest.slice(0, colonIdx);
    const pass = rest.slice(colonIdx + 1, lastAtIdx);
    const hostAndDb = rest.slice(lastAtIdx + 1);
    if (pass.includes('@') || pass.includes('#') || pass.includes('$')) {
      const encodedPass = encodeURIComponent(decodeURIComponent(pass));
      normalized = `${prefix}${user}:${encodedPass}@${hostAndDb}`;
    }
  }
  if (!normalized.includes('sslmode=')) {
    normalized += (normalized.includes('?') ? '&' : '?') + 'sslmode=disable';
  }
  return normalized;
}

function parseEnv(): Env {
  // If in test mode and secrets not present, supply safe dummy values
  const rawEnv = { ...process.env };
  if (rawEnv.DATABASE_URL) {
    rawEnv.DATABASE_URL = normalizeDatabaseUrl(rawEnv.DATABASE_URL);
    process.env.DATABASE_URL = rawEnv.DATABASE_URL;
  }
  if (nodeEnv === 'test') {
    rawEnv.DATABASE_URL = rawEnv.DATABASE_URL || 'postgresql://test:test@localhost:5432/kings_taxi_test?schema=public';
    rawEnv.JWT_ACCESS_SECRET = rawEnv.JWT_ACCESS_SECRET || 'test_jwt_access_secret_min_32_characters_long_for_tests';
    rawEnv.JWT_REFRESH_SECRET = rawEnv.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_min_32_characters_long_for_tests';
    rawEnv.LOG_LEVEL = rawEnv.LOG_LEVEL || 'silent';
  }

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    console.error(`[FATAL] Invalid environment configuration:\n${errorDetails}`);
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }

  if (result.data.NODE_ENV !== 'test') {
    validateDatabaseIsolationAtStartup(result.data.DATABASE_URL);
  }

  return result.data;
}

export const env = parseEnv();

