import { CorsOptions } from 'cors';
import { env } from './env';

export function getCorsOptions(): CorsOptions {
  const allowedOrigins =
    env.CORS_ORIGINS === '*'
      ? '*'
      : env.CORS_ORIGINS.split(',').map((origin) => origin.trim());

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'Idempotency-Key'],
    exposedHeaders: ['x-request-id'],
    maxAge: 86400, // 24 hours
  };
}

