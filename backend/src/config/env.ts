import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load appropriate .env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
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

  // Optional future service credentials
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().default('KingsTaxiAuthBot'),
  CHAPA_SECRET_KEY: z.string().optional(),
  CHAPA_PUBLIC_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // If in test mode and secrets not present, supply safe dummy values
  const rawEnv = { ...process.env };
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

  return result.data;
}

export const env = parseEnv();

