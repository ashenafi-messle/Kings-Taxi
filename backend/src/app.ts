import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { getCorsOptions } from './config/cors';
import { logger } from './core/logging/logger';
import { requestIdMiddleware } from './core/middleware/requestId';
import { globalRateLimiter } from './core/middleware/rateLimiter';
import { notFoundHandler } from './core/middleware/notFound';
import { errorHandler } from './core/errors/errorHandler';
import { apiV1Router } from './routes';
import { swaggerRouter } from './config/swagger';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy for reverse proxy deployments (Nginx on VPS / Docker)
  app.set('trust proxy', 1);

  // 2. Request correlation ID
  app.use(requestIdMiddleware);

  // 3. Security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 4. CORS configuration
  app.use(cors(getCorsOptions()));

  // 5. Structured HTTP logging with Pino
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => (req.headers['x-request-id'] as string) || 'req_unknown',
      })
    );
  }

  // 6. Global rate limiting
  app.use(globalRateLimiter);

  // 7. Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 8. API Documentation (Swagger OpenAPI 3.0)
  app.use(env.API_PREFIX, swaggerRouter);

  // 9. Mount API v1 routes
  app.use(env.API_PREFIX, apiV1Router);

  // 10. Root redirect to API documentation or health
  app.get('/', (_req, res) => {
    res.redirect(`${env.API_PREFIX}/health`);
  });

  // 11. 404 Handler
  app.use(notFoundHandler);

  // 12. Central Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();

