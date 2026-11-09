import { Router } from 'express';
import { HealthController } from './health.controller';
import { AuthController } from '../auth/auth.controller';

export const healthRouter = Router();

// Standard health endpoints
healthRouter.get('/health', HealthController.getHealth);
healthRouter.get('/health/live', HealthController.getLive);
healthRouter.get('/health/ready', HealthController.getReady);
healthRouter.get('/health/diagnostics', AuthController.getDiagnostics);

// Direct probe aliases (/api/v1/live, /api/v1/ready, /api/v1/diagnostics)
healthRouter.get('/live', HealthController.getLive);
healthRouter.get('/ready', HealthController.getReady);
healthRouter.get('/diagnostics', AuthController.getDiagnostics);
