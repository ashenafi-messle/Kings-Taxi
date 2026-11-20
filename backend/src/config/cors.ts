import { CorsOptions } from 'cors';
import { env } from './env';

const KNOWN_ALLOWED_ORIGINS = [
  'https://kings-taxi.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:19006',
  'http://localhost:8081',
];

export function getCorsOptions(): CorsOptions {
  const envOrigins =
    env.CORS_ORIGINS && env.CORS_ORIGINS !== '*'
      ? env.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
      : [];

  const allAllowed = Array.from(new Set([...KNOWN_ALLOWED_ORIGINS, ...envOrigins]));

  return {
    origin: (requestOrigin, callback) => {
      // 1. Allow mobile apps, curl, server-to-server, or same-origin requests with no origin header
      if (!requestOrigin) {
        return callback(null, true);
      }

      const normalizedOrigin = requestOrigin.replace(/\/+$/, '');

      // 2. Allow if wildcard is explicitly enabled in dev/test
      if (env.CORS_ORIGINS === '*' && env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // 3. Exact match against known allowed origins
      if (allAllowed.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // 4. Match Kings Taxi Vercel preview environments (*.vercel.app)
      if (
        /^https:\/\/kings-taxi([a-zA-Z0-9_-]*)\.vercel\.app$/.test(normalizedOrigin) ||
        /^https:\/\/kings-taxi\.onrender\.com$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // 5. In development, allow localhost on any port
      if (env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin '${requestOrigin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-request-id',
      'Idempotency-Key',
      'Cache-Control',
      'cache-control',
      'Pragma',
      'Expires',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['x-request-id'],
    maxAge: 86400, // 24 hours
  };
}
