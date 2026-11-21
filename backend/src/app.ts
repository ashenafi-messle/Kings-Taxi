import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import { supportController } from './modules/support/support.controller';

export function createApp(): Express {
  const app = express();

  // 1. Trust proxy for reverse proxy deployments (Nginx on VPS / Docker)
  app.set('trust proxy', 1);

  // Normalize incoming URLs: clean up duplicate slashes and redundant /api prefixes from client proxies
  app.use((req, _res, next) => {
    if (req.url && (req.url.includes('//') || req.url.includes('/api//') || req.url.includes('/api/api/'))) {
      req.url = req.url
        .replace(/\/api\/\/api\//g, '/api/')
        .replace(/\/api\/api\//g, '/api/')
        .replace(/([^:]\/)\/+/g, '$1');
    }
    next();
  });

  // 2. Request correlation ID
  app.use(requestIdMiddleware);

  // 3. Security headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      frameguard: false,
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

  // 7. Request body parsing (10mb to support photo uploads)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory for media assets
  const uploadsDir = fs.existsSync(path.join(process.cwd(), 'public/uploads'))
    ? path.join(process.cwd(), 'public/uploads')
    : path.join(process.cwd(), 'backend/public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // 8. API Documentation (Swagger OpenAPI 3.0)
  app.use(env.API_PREFIX, swaggerRouter);

  // 9. Mount API v1 routes
  app.use(env.API_PREFIX, apiV1Router);

  // Dedicated direct browser routes for Super Admin Portals
  app.get('/admin/support', (req, res) => supportController.renderDashboard(req, res));
  app.get('/admin/support/dashboard', (req, res) => supportController.renderDashboard(req, res));

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

